import { z } from "zod";

/** Paginated JSON list response shared by FDW time-series endpoints. */
export const fdwPagedResponseSchema = z.object({
  count: z.number().int().nonnegative(),
  next: z.string().nullable(),
  previous: z.string().nullable(),
  results: z.array(z.record(z.string(), z.unknown())),
});

/** Properties of one `ipcphase.geojson` feature (only the fields this app reads). */
export const fdwIpcPhasePropertiesSchema = z.object({
  fnid: z.string().min(1),
  geographic_unit: z.number().int().nullable().optional(),
  geographic_unit_name: z.string(),
  geographic_unit_full_name: z.string().optional().default(""),
  unit_type: z.string(),
  country_code: z.string(),
  country: z.string(),
  classification_scale: z.string(),
  scenario: z.string(),
  scenario_name: z.string(),
  is_allowing_for_assistance: z.boolean().nullable().optional(),
  projection_start: z.string().nullable().optional(),
  projection_end: z.string().nullable().optional(),
  reporting_date: z.string().nullable().optional(),
  value: z.number().nullable(),
  description: z.string().nullable().optional(),
  source_organization: z.string(),
  source_document: z.string(),
  data_usage_policy: z.string(),
  collection_status: z.string().nullable().optional(),
  modified: z.string().nullable().optional(),
  dataseries_name: z.string().optional(),
});

const positionSchema = z.array(z.number()).min(2);
const ringSchema = z.array(positionSchema);

export const fdwGeometrySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("Polygon"), coordinates: z.array(ringSchema) }),
  z.object({ type: z.literal("MultiPolygon"), coordinates: z.array(z.array(ringSchema)) }),
  z.object({ type: z.literal("Point"), coordinates: positionSchema }),
  z.object({ type: z.literal("MultiPoint"), coordinates: z.array(positionSchema) }),
  z.object({ type: z.literal("LineString"), coordinates: ringSchema }),
  z.object({ type: z.literal("MultiLineString"), coordinates: z.array(ringSchema) }),
]);

export const fdwIpcPhaseFeatureSchema = z.object({
  type: z.literal("Feature"),
  geometry: fdwGeometrySchema.nullable(),
  properties: fdwIpcPhasePropertiesSchema,
});

export const fdwIpcPhaseGeoJsonSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(fdwIpcPhaseFeatureSchema),
});

export type FdwIpcPhaseProperties = z.infer<typeof fdwIpcPhasePropertiesSchema>;
export type FdwIpcPhaseFeature = z.infer<typeof fdwIpcPhaseFeatureSchema>;
export type FdwIpcPhaseGeoJson = z.infer<typeof fdwIpcPhaseGeoJsonSchema>;
export type FdwGeometry = z.infer<typeof fdwGeometrySchema>;
