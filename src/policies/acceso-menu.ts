import { errors } from '@strapi/utils';
import type { Core } from '@strapi/strapi';

const MENUS = ['productos', 'comprobantes', 'usuarios'] as const;

type Menu = (typeof MENUS)[number];
type Flag = 'consulta' | 'alta' | 'baja' | 'modificacion';

const FLAG_POR_ACCION: Record<string, Flag> = {
  find: 'consulta',
  findOne: 'consulta',
  create: 'alta',
  update: 'modificacion',
  delete: 'baja',
};

const ETIQUETA: Record<Flag, string> = {
  consulta: 'consulta',
  alta: 'alta',
  baja: 'baja',
  modificacion: 'modificación',
};

type Config = {
  menu?: string;
};

type Contexto = {
  state: {
    user?: { id?: number };
    route?: { handler?: unknown };
  };
};

type Acceso = {
  consulta?: boolean | null;
  alta?: boolean | null;
  baja?: boolean | null;
  modificacion?: boolean | null;
  menu?: { codigo?: string | null } | null;
};

type UsuarioConGrupo = {
  grupo?: {
    accesos?: Acceso[] | null;
  } | null;
};

function esMenu(valor: string): valor is Menu {
  return (MENUS as readonly string[]).includes(valor);
}

function accionDelHandler(handler: unknown) {
  if (typeof handler !== 'string') {
    return undefined;
  }

  return handler.split('.').pop();
}

export function configAcceso(menu: Menu) {
  return {
    policies: [{ name: 'global::acceso-menu', config: { menu } }],
  };
}

export default async function accesoMenu(
  ctx: Contexto,
  config: Config,
  { strapi }: { strapi: Core.Strapi }
) {
  if (!config.menu || !esMenu(config.menu)) {
    throw new Error('La policy acceso-menu necesita un menú válido');
  }

  const menu = config.menu;
  const accion = accionDelHandler(ctx.state.route?.handler);
  const flag = accion ? FLAG_POR_ACCION[accion] : undefined;

  if (!flag) {
    throw new errors.PolicyError('No tiene permiso para realizar esta acción');
  }

  const mensaje = `No tiene permiso de ${ETIQUETA[flag]} en ${menu}`;
  const userId = ctx.state.user?.id;

  if (!userId) {
    throw new errors.PolicyError(mensaje);
  }

  const usuario = (await strapi.db.query('plugin::users-permissions.user').findOne({
    where: { id: userId },
    populate: {
      grupo: {
        populate: {
          accesos: {
            populate: {
              menu: true,
            },
          },
        },
      },
    },
  })) as UsuarioConGrupo | null;

  const accesos = usuario?.grupo?.accesos ?? [];
  const permitido = accesos.some(
    (acceso) => acceso.menu?.codigo === menu && acceso[flag] === true
  );

  if (!permitido) {
    throw new errors.PolicyError(mensaje);
  }

  return true;
}
