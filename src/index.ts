import type { Core } from '@strapi/strapi';

const CONTENT_TYPES = [
  'api::producto.producto',
  'api::comprobante.comprobante',
  'api::menu.menu',
  'api::grupo.grupo',
];

const ACCIONES = ['find', 'findOne', 'create', 'update', 'delete'];

async function habilitarPermisosAutenticados(strapi: Core.Strapi) {
  const role = await strapi.db.query('plugin::users-permissions.role').findOne({
    where: { type: 'authenticated' },
  });

  if (!role) {
    return;
  }

  for (const uid of CONTENT_TYPES) {
    for (const accion of ACCIONES) {
      const action = `${uid}.${accion}`;

      const existente = await strapi.db.query('plugin::users-permissions.permission').findOne({
        where: {
          action,
          role: { id: role.id },
        },
      });

      if (existente) {
        continue;
      }

      await strapi.db.query('plugin::users-permissions.permission').create({
        data: {
          action,
          role: role.id,
        },
      });
    }
  }
}

export default {
  register() {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await habilitarPermisosAutenticados(strapi);
  },
};
