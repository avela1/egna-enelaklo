/**
 * The service catalogue.
 *
 * The catalogue is data driven: a new service is added by inserting a row
 * (and a form template), never by changing application code.
 */
export const ServiceType = {
  BUY_AND_DELIVER: 'BUY_AND_DELIVER',
  QUEUE_AND_PAPERWORK: 'QUEUE_AND_PAPERWORK',
  PICKUP_AND_DROPOFF: 'PICKUP_AND_DROPOFF',
} as const;

export type ServiceType = (typeof ServiceType)[keyof typeof ServiceType];

export const SERVICE_TYPE_VALUES = Object.values(ServiceType) as [ServiceType, ...ServiceType[]];
