import { errors } from '@strapi/utils';

const COMPROBANTE = 'api::comprobante.comprobante';
const ITEM = 'comprobante.items-comprobante';
const PRODUCTO = 'api::producto.producto';

type ProductoEnLinea = {
  id: number;
  stock: number | string | null;
};

type Linea = {
  id: number;
  cantidad: number | string | null;
  producto: ProductoEnLinea | null;
};

type ComprobanteGuardado = {
  id: number;
  estado: string;
  items?: Linea[] | null;
};

type Evento = {
  params: {
    where?: { id: number };
    data?: {
      estado?: string;
      items?: Array<{ id: number }>;
    };
  };
  state: {
    cantidades?: Map<number, number>;
  };
};

const MENSAJE = 'Cada línea tiene que tener un producto y una cantidad mayor a 0';

function cantidadValida(cantidad: number | string | null) {
  const valor = Number(cantidad);
  return Number.isFinite(valor) && valor > 0;
}

function cantidadesPorProducto(lineas: Linea[]) {
  const cantidades = new Map<number, number>();

  for (const linea of lineas) {
    if (!linea.producto) {
      continue;
    }

    const cantidad = Number(linea.cantidad);
    const acumulada = cantidades.get(linea.producto.id) ?? 0;
    cantidades.set(linea.producto.id, acumulada + cantidad);
  }

  return cantidades;
}

async function moverStock(cantidades: Map<number, number>, signo: 1 | -1) {
  for (const [id, cantidad] of cantidades) {
    const producto = (await strapi.db.query(PRODUCTO).findOne({
      where: { id },
    })) as ProductoEnLinea | null;

    if (!producto) {
      continue;
    }

    const stock = Number(producto.stock ?? 0);

    await strapi.db.query(PRODUCTO).update({
      where: { id },
      data: {
        stock: stock + signo * cantidad,
      },
    });
  }
}

async function lineasDelUpdate(data: Evento['params']['data'], guardado: ComprobanteGuardado | null) {
  if (!Array.isArray(data?.items)) {
    return guardado?.items ?? [];
  }

  const lineas: Linea[] = [];

  for (const pivote of data.items) {
    const linea = (await strapi.db.query(ITEM).findOne({
      where: { id: pivote.id },
      populate: ['producto'],
    })) as Linea | null;

    if (linea) {
      lineas.push(linea);
    }
  }

  return lineas;
}

export default {
  async beforeUpdate(event: Evento) {
    const guardado = (await strapi.db.query(COMPROBANTE).findOne({
      where: event.params.where,
      populate: {
        items: {
          populate: ['producto'],
        },
      },
    })) as ComprobanteGuardado | null;

    const nuevoEstado = event.params.data?.estado;
    const pasaAConfirmado = guardado?.estado !== 'confirmado' && nuevoEstado === 'confirmado';

    if (!pasaAConfirmado) {
      return;
    }

    const lineas = await lineasDelUpdate(event.params.data, guardado);

    for (const linea of lineas) {
      if (!linea.producto || !cantidadValida(linea.cantidad)) {
        throw new errors.ValidationError(MENSAJE);
      }
    }

    if (lineas.length === 0) {
      throw new errors.ValidationError(MENSAJE);
    }

    event.state = {
      cantidades: cantidadesPorProducto(lineas),
    };
  },

  async afterUpdate(event: Evento) {
    const cantidades = event.state.cantidades;

    if (!cantidades) {
      return;
    }

    await moverStock(cantidades, 1);
  },

  async beforeDelete(event: Evento) {
    const guardado = (await strapi.db.query(COMPROBANTE).findOne({
      where: event.params.where,
      populate: {
        items: {
          populate: ['producto'],
        },
      },
    })) as ComprobanteGuardado | null;

    if (guardado?.estado !== 'confirmado') {
      return;
    }

    event.state = {
      cantidades: cantidadesPorProducto(guardado.items ?? []),
    };
  },

  async afterDelete(event: Evento) {
    const cantidades = event.state.cantidades;

    if (!cantidades) {
      return;
    }

    await moverStock(cantidades, -1);
  },
};
