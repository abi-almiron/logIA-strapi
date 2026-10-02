/**
 * producto router.
 */

import { factories } from '@strapi/strapi';
import { configAcceso } from '../../../policies/acceso-menu';

const acceso = configAcceso('productos');

export default factories.createCoreRouter('api::producto.producto', {
  config: {
    find: acceso,
    findOne: acceso,
    create: acceso,
    update: acceso,
    delete: acceso,
  },
});
