import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import type { Principal } from '../../common/auth/principal';
import type { RequestMeta } from '../../common/http/request-meta';
import {
  allFields,
  FIELD_TYPES,
  MAPPED_FIELDS,
  type MappedField,
  type TemplateDefinition,
} from '@egna-enelaklo/shared';

export interface DefinitionIssue {
  field?: string;
  message: string;
}

export interface PublishSummary {
  fieldsAdded: string[];
  fieldsRemoved: string[];
  version: number;
}

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** The services a customer may choose from, with the live template. */
  async listLiveServices() {
    const services = await this.prisma.service.findMany({
      where: { status: 'LIVE' },
      orderBy: [{ sortOrder: 'asc' }, { key: 'asc' }],
      include: { templates: { where: { status: 'LIVE' }, orderBy: { version: 'desc' } } },
    });

    return services
      .filter((service) => service.templates.length > 0)
      .map((service) => {
        const template = service.templates[0];

        if (!template) {
          throw new Error(`Service ${service.key} has no live template`);
        }

        return {
          id: service.id,
          key: service.key,
          name: service.name,
          description: service.description,
          icon: service.icon,
          templateId: template.id,
          templateVersion: template.version,
        };
      });
  }

  /** The live template of a service, with its definition. */
  async getLiveTemplate(key: string) {
    const service = await this.prisma.service.findUnique({
      where: { key },
      include: { templates: { where: { status: 'LIVE' }, orderBy: { version: 'desc' } } },
    });

    if (!service || service.templates.length === 0) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Service not found' });
    }

    const template = service.templates[0];

    if (!template) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Service not found' });
    }

    return {
      serviceId: service.id,
      serviceKey: service.key,
      serviceName: service.name,
      templateId: template.id,
      version: template.version,
      definition: template.definition as unknown as TemplateDefinition,
    };
  }

  /** Everything the staff catalog screen needs. */
  async staffList() {
    const services = await this.prisma.service.findMany({
      orderBy: [{ sortOrder: 'asc' }, { key: 'asc' }],
      include: { templates: { orderBy: { version: 'desc' } } },
    });

    return services.map((service) => {
      const live = service.templates.find((template) => template.status === 'LIVE');
      const draft = service.templates.find((template) => template.status === 'DRAFT');
      const latest = service.templates[0];

      return {
        id: service.id,
        key: service.key,
        name: service.name,
        description: service.description,
        icon: service.icon,
        status: service.status,
        sortOrder: service.sortOrder,
        liveVersion: live?.version ?? null,
        draftVersion: draft?.version ?? null,
        latestVersion: latest?.version ?? null,
        versions: service.templates.length,
        updatedAt: service.updatedAt.toISOString(),
      };
    });
  }

  async listTemplates(serviceId: string) {
    const templates = await this.prisma.serviceTemplate.findMany({
      where: { serviceId },
      orderBy: { version: 'desc' },
    });

    return templates.map((template) => ({
      id: template.id,
      serviceId: template.serviceId,
      version: template.version,
      status: template.status,
      definition: template.definition as unknown as TemplateDefinition,
      publishedAt: template.publishedAt?.toISOString() ?? null,
      createdAt: template.createdAt.toISOString(),
    }));
  }

  /** Creates a new service with an empty draft template. */
  async createService(
    input: { description: unknown; icon: string; key: string; name: unknown },
    principal: Principal,
    meta: RequestMeta,
  ) {
    const existing = await this.prisma.service.findUnique({ where: { key: input.key } });
    if (existing) {
      throw new BadRequestException({
        code: 'KEY_TAKEN',
        message: 'A service with this key already exists',
      });
    }

    const service = await this.prisma.$transaction(async (tx) => {
      const created = await tx.service.create({
        data: {
          key: input.key,
          name: input.name as never,
          description: input.description as never,
          icon: input.icon,
          status: 'DRAFT',
        },
      });

      await tx.serviceTemplate.create({
        data: {
          serviceId: created.id,
          version: 1,
          status: 'DRAFT',
          definition: { sections: [], requiredEvidence: [] } as never,
          createdBy: principal.id,
        },
      });

      await this.audit.record(
        {
          actorId: principal.id,
          actorRole: principal.role,
          action: 'service.created',
          targetType: 'service',
          targetId: created.id,
          after: { key: created.key, status: created.status, version: 1 },
          ip: meta.ip,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
        },
        tx,
      );

      return created;
    });

    return { id: service.id, key: service.key, status: service.status };
  }

  /** Updates the name, the description, the icon, the status or the order. */
  async updateService(
    serviceId: string,
    input: {
      description?: unknown;
      icon?: string;
      name?: unknown;
      sortOrder?: number;
      status?: 'DRAFT' | 'DISABLED' | 'LIVE';
    },
    principal: Principal,
    meta: RequestMeta,
  ) {
    const before = await this.prisma.service.findUnique({ where: { id: serviceId } });
    if (!before) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Service not found' });
    }

    const service = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.service.update({
        where: { id: serviceId },
        data: {
          ...(input.name === undefined ? {} : { name: input.name as never }),
          ...(input.description === undefined ? {} : { description: input.description as never }),
          ...(input.icon === undefined ? {} : { icon: input.icon }),
          ...(input.status === undefined ? {} : { status: input.status }),
          ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder }),
        },
      });

      await this.audit.record(
        {
          actorId: principal.id,
          actorRole: principal.role,
          action: 'service.updated',
          targetType: 'service',
          targetId: updated.id,
          before: {
            name: before.name,
            status: before.status,
            sortOrder: before.sortOrder,
            icon: before.icon,
          },
          after: {
            name: updated.name,
            status: updated.status,
            sortOrder: updated.sortOrder,
            icon: updated.icon,
          },
          ip: meta.ip,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
        },
        tx,
      );

      return updated;
    });

    return { id: service.id, key: service.key, status: service.status };
  }

  /** Creates a new draft version, starting from the live definition. */
  async createDraftTemplate(serviceId: string, principal: Principal, meta: RequestMeta) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: { templates: { orderBy: { version: 'desc' } } },
    });

    if (!service) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Service not found' });
    }

    const latest = service.templates[0];
    const version = (latest?.version ?? 0) + 1;

    const template = await this.prisma.$transaction(async (tx) => {
      const created = await tx.serviceTemplate.create({
        data: {
          serviceId,
          version,
          status: 'DRAFT',
          definition: (latest?.definition ?? { sections: [], requiredEvidence: [] }) as never,
          createdBy: principal.id,
        },
      });

      await this.audit.record(
        {
          actorId: principal.id,
          actorRole: principal.role,
          action: 'template.draft_created',
          targetType: 'service_template',
          targetId: created.id,
          after: { serviceId, version, status: 'DRAFT' },
          ip: meta.ip,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
        },
        tx,
      );

      return created;
    });

    return {
      id: template.id,
      serviceId: template.serviceId,
      version: template.version,
      status: template.status,
      definition: template.definition as unknown as TemplateDefinition,
    };
  }

  /** Saves the definition of a draft template. */
  async saveDraftTemplate(
    templateId: string,
    definition: TemplateDefinition,
    principal: Principal,
    meta: RequestMeta,
  ) {
    const template = await this.prisma.serviceTemplate.findUnique({ where: { id: templateId } });

    if (!template) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Template not found' });
    }

    if (template.status !== 'DRAFT') {
      throw new BadRequestException({
        code: 'TEMPLATE_LOCKED',
        message: 'Only a draft template can be edited',
      });
    }

    const saved = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.serviceTemplate.update({
        where: { id: templateId },
        data: { definition: definition as never },
      });

      await this.audit.record(
        {
          actorId: principal.id,
          actorRole: principal.role,
          action: 'template.draft_saved',
          targetType: 'service_template',
          targetId: updated.id,
          after: {
            version: updated.version,
            sections: definition.sections.length,
            fields: allFields(definition).length,
          },
          ip: meta.ip,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
        },
        tx,
      );

      return updated;
    });

    return {
      id: saved.id,
      version: saved.version,
      status: saved.status,
      definition: saved.definition as unknown as TemplateDefinition,
    };
  }

  /**
   * Publishes a draft template: the previous live version is archived and the
   * draft becomes the live one. The tasks that already exist keep their own
   * version forever.
   */
  async publishTemplate(templateId: string, principal: Principal, meta: RequestMeta) {
    const template = await this.prisma.serviceTemplate.findUnique({
      where: { id: templateId },
      include: { service: { include: { templates: { where: { status: 'LIVE' } } } } },
    });

    if (!template) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Template not found' });
    }

    if (template.status !== 'DRAFT') {
      throw new BadRequestException({
        code: 'TEMPLATE_LOCKED',
        message: 'Only a draft template can be published',
      });
    }

    const definition = template.definition as unknown as TemplateDefinition;
    const live = template.service.templates[0];
    const liveDefinition = live?.definition as unknown as TemplateDefinition | undefined;

    const issues = this.validateDefinition(definition, liveDefinition);
    if (issues.length > 0) {
      throw new BadRequestException({
        code: 'TEMPLATE_INVALID',
        message: 'The template is not valid yet',
        details: issues,
      });
    }

    const summary = this.summarize(definition, liveDefinition);

    const published = await this.prisma.$transaction(async (tx) => {
      if (live) {
        await tx.serviceTemplate.update({
          where: { id: live.id },
          data: { status: 'ARCHIVED' },
        });
      }

      const updated = await tx.serviceTemplate.update({
        where: { id: templateId },
        data: {
          status: 'LIVE',
          publishedAt: new Date(),
          publishedBy: principal.id,
        },
      });

      await this.audit.record(
        {
          actorId: principal.id,
          actorRole: principal.role,
          action: 'template.published',
          targetType: 'service_template',
          targetId: updated.id,
          before: live ? { version: live.version, status: 'LIVE' } : undefined,
          after: { version: updated.version, status: 'LIVE', ...summary },
          ip: meta.ip,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
        },
        tx,
      );

      return updated;
    });

    return { id: published.id, version: published.version, status: published.status, summary };
  }

  /**
   * Checks a definition: unique keys, known types, existing showIf targets and
   * the attributes the live version needs.
   */
  validateDefinition(
    definition: TemplateDefinition,
    liveDefinition?: TemplateDefinition,
  ): DefinitionIssue[] {
    const issues: DefinitionIssue[] = [];
    const fields = allFields(definition);
    const keys = new Set<string>();

    for (const field of fields) {
      if (!field.key || keys.has(field.key)) {
        issues.push({ field: field.key, message: 'The field keys have to be unique' });
        continue;
      }

      keys.add(field.key);

      if (!FIELD_TYPES.includes(field.type)) {
        issues.push({ field: field.key, message: `Unknown field type ${field.type}` });
      }

      if (field.type === 'select' && (!field.options || field.options.length === 0)) {
        issues.push({ field: field.key, message: 'A select needs at least one option' });
      }

      if (field.type === 'repeater' && (!field.fields || field.fields.length === 0)) {
        issues.push({ field: field.key, message: 'A repeater needs at least one sub field' });
      }

      if (field.mapsTo && !MAPPED_FIELDS.includes(field.mapsTo)) {
        issues.push({ field: field.key, message: `Unknown mapsTo ${field.mapsTo}` });
      }
    }

    for (const field of fields) {
      if (!field.showIf) continue;

      if (!keys.has(field.showIf.field)) {
        issues.push({
          field: field.key,
          message: `The condition refers to the unknown field ${field.showIf.field}`,
        });
      }
    }

    // The attributes the live version has must stay.
    if (liveDefinition) {
      const required = new Set(
        allFields(liveDefinition)
          .map((field) => field.mapsTo)
          .filter((value): value is MappedField => Boolean(value)),
      );

      const present = new Set(
        fields.map((field) => field.mapsTo).filter((value): value is MappedField => Boolean(value)),
      );

      for (const mapped of required) {
        if (!present.has(mapped)) {
          issues.push({
            message: `The field that fills ${mapped} may not be removed`,
          });
        }
      }
    }

    return issues;
  }

  private summarize(
    definition: TemplateDefinition,
    liveDefinition?: TemplateDefinition,
  ): Omit<PublishSummary, 'version'> {
    const next = new Set(allFields(definition).map((field) => field.key));
    const previous = new Set(
      allFields(liveDefinition ?? { sections: [], requiredEvidence: [] }).map((field) => field.key),
    );

    return {
      fieldsAdded: [...next].filter((key) => !previous.has(key)),
      fieldsRemoved: [...previous].filter((key) => !next.has(key)),
    };
  }
}
