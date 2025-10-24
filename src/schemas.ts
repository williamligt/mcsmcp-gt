import { z } from "zod";

// Enum types (you'll need to define these based on your constants.py)
export const OrderStatusTypeSchema = z.string(); // Replace with actual enum values if needed
export const DeliveryStatusTypeSchema = z.string(); // Replace with actual enum values if needed

// Sku schema
export const SkuSchema = z.object({
  orderNumber: z.number().describe("The order number"),
  orderSuffix: z.number().describe("The order suffix"),
  sku: z.string().optional().describe("The SKU identifier"),
  pickQty: z.number().optional().describe("quantity of sku")
});

// Carton schema
export const CartonSchema = z.object({
  orderNumber: z.number().describe("The order number"),
  orderSuffix: z.number().describe("The order suffix"),
  cartonId: z.number().optional().describe("The carton identifier"),
  deliveryStatusDescription: DeliveryStatusTypeSchema.optional().describe("Delivery status description"),
  expectedDeliveryDate: z.string().optional().describe("the expected date of delivery (ISO format)"),
  actualDeliveryDate: z.string().optional().describe("date it was delivered, null means that it has not been delivered yet (ISO format)"),
  carrierCode: z.string().optional().describe("Carrier code"),
  carrierDescription: z.string().optional().describe("name of the carrier"),
  traceAndTraceLink: z.string().optional().describe("This is the link to track the package"),
  skus: z.array(SkuSchema).describe("This is a list of the skus in the order")
});

// OrderNumber schema (main schema)
export const OrderNumberSchema: z.ZodType<{
  orderNumber: number;
  orderBookedDate: string;
  orderSuffix: number;
  orderStatus: string;
  orderContactFullName: string;
  contactEmailAddress: string;
  contactPhone: number;
  shipTo: number;
  shipToName: string;
  splitOrders?: Array<any>; // Will be resolved recursively
  skus?: Array<z.infer<typeof SkuSchema>>;
  cartons?: Array<z.infer<typeof CartonSchema>>;
}> = z.lazy(() => z.object({
  orderNumber: z.number().describe("The main order number"),
  orderBookedDate: z.string().describe("The date the order was booked (ISO format)"),
  orderSuffix: z.number().describe('this is the backorder level, a order number might have multiple backorder levels this is when we have some of the items in stock and some not so the ones that are not in stock are moved to a higher back order level to be delivered later'),
  orderStatus: z.string().describe("Status of the order"),
  orderContactFullName: z.string().describe("Full name of the order contact"),
  contactEmailAddress: z.string().describe("Email address of the contact"),
  contactPhone: z.number().describe("Phone number of the contact"),
  shipTo: z.number().describe("Ship to identifier"),
  shipToName: z.string().describe("Ship to name"),
  splitOrders: z.array(OrderNumberSchema).optional().describe("This is the list of all the orders that this order has been split into. When an order splits into other orders it is commonly because we don't have it and it is being fulfilled by someone else. Some of the items go to the split order and some remain in the original"),
  skus: z.array(SkuSchema).optional().describe("this is the skus associated with this order, not including its split orders"),
  cartons: z.array(CartonSchema).optional().describe("this is the cartons associated with this order, cartons are the units that we deliver in, each carton is delivered as a separate entity")
}));

// Product schemas
export const ProductRequestSchema = z.object({
  skus: z.array(z.string()).describe("Array of SKU numbers to look up")
});

export const ProductSchema = z.object({
  sku: z.string().describe("The SKU identifier"),
  hfaDescription: z.string().describe("HFA description"),
  manufacturerName: z.string().describe("Manufacturer name")
});

// Type exports for TypeScript usage
export type Sku = z.infer<typeof SkuSchema>;
export type Carton = z.infer<typeof CartonSchema>;
export type OrderNumber = z.infer<typeof OrderNumberSchema>;
export type OrderNumberList = z.infer<typeof OrderNumberListSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type ProductRequest = z.infer<typeof ProductRequestSchema>;

// Array of OrderNumbers schema
export const OrderNumberListSchema = z.array(OrderNumberSchema).describe("Array of order numbers with their details");