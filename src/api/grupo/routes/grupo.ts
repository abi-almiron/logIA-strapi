/**
 * grupo router.
 */

import { factories } from '@strapi/strapi';
import { configAcceso } from '../../../policies/acceso-menu';

const acceso = configAcceso('usuarios');

export default factories.createCoreRouter('api::grupo.grupo', {
  config: {
    find: acceso,
    findOne: acceso,
    create: acceso,
    update: acceso,
    delete: acceso,
  },
});
