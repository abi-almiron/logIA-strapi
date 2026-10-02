/**
 * comprobante router.
 */

import { factories } from '@strapi/strapi';
import { configAcceso } from '../../../policies/acceso-menu';

const acceso = configAcceso('comprobantes');

export default factories.createCoreRouter('api::comprobante.comprobante', {
  config: {
    find: acceso,
    findOne: acceso,
    create: acceso,
    update: acceso,
    delete: acceso,
  },
});
