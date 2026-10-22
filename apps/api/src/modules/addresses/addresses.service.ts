import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AddressValues } from '@egna-enelaklo/shared';
import type { PrismaService } from '../../common/prisma/prisma.service';

const MAX_ADDRESSES = 20;

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  /** The addresses of a customer, the deleted ones are left out. */
  async list(userId: string) {
    const addresses = await this.prisma.address.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    return addresses.map((address) => ({
      id: address.id,
      label: address.label,
      subCity: address.subCity,
      woreda: address.woreda,
      landmark: address.landmark,
      directions: address.directions,
      contactName: address.contactName,
      contactPhone: address.contactPhone,
      isDefault: address.isDefault,
    }));
  }

  async create(userId: string, values: AddressValues) {
    const count = await this.prisma.address.count({ where: { userId, deletedAt: null } });

    if (count >= MAX_ADDRESSES) {
      throw new BadRequestException({
        code: 'TOO_MANY_ADDRESSES',
        message: `You can save at most ${MAX_ADDRESSES} addresses`,
      });
    }

    const isFirst = count === 0;
    const makeDefault = values.isDefault ?? isFirst;

    const address = await this.prisma.$transaction(async (tx) => {
      if (makeDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.address.create({
        data: {
          userId,
          label: values.label,
          subCity: values.subCity,
          woreda: values.woreda === '' ? null : values.woreda,
          landmark: values.landmark,
          directions: values.directions,
          contactName: values.contactName,
          contactPhone: values.contactPhone,
          isDefault: makeDefault,
        },
      });
    });

    return this.toDto(address);
  }

  async update(userId: string, addressId: string, values: Partial<AddressValues>) {
    const address = await this.findOwned(userId, addressId);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (values.isDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true, id: { not: addressId } },
          data: { isDefault: false },
        });
      }

      return tx.address.update({
        where: { id: address.id },
        data: {
          ...(values.label === undefined ? {} : { label: values.label }),
          ...(values.subCity === undefined ? {} : { subCity: values.subCity }),
          ...(values.woreda === undefined
            ? {}
            : { woreda: values.woreda === '' ? null : values.woreda }),
          ...(values.landmark === undefined ? {} : { landmark: values.landmark }),
          ...(values.directions === undefined ? {} : { directions: values.directions }),
          ...(values.contactName === undefined ? {} : { contactName: values.contactName }),
          ...(values.contactPhone === undefined ? {} : { contactPhone: values.contactPhone }),
          ...(values.isDefault === undefined ? {} : { isDefault: values.isDefault }),
        },
      });
    });

    return this.toDto(updated);
  }

  /** Removes an address. The row stays, so the tasks that used it keep working. */
  async remove(userId: string, addressId: string) {
    const address = await this.findOwned(userId, addressId);

    const wasDefault = address.isDefault;

    await this.prisma.$transaction(async (tx) => {
      await tx.address.update({
        where: { id: address.id },
        data: { deletedAt: new Date(), isDefault: false },
      });

      // The first address that is left becomes the default one.
      if (wasDefault) {
        const next = await tx.address.findFirst({
          where: { userId, deletedAt: null },
          orderBy: { createdAt: 'asc' },
        });

        if (next) {
          await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
        }
      }
    });

    return { ok: true };
  }

  /** The address of this customer, or a 404 when it is not theirs. */
  async findOwned(userId: string, addressId: string) {
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, userId, deletedAt: null },
    });

    if (!address) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Address not found' });
    }

    return address;
  }

  private toDto(address: {
    contactName: string;
    contactPhone: string;
    directions: string;
    id: string;
    isDefault: boolean;
    label: string;
    landmark: string;
    subCity: string;
    woreda: string | null;
  }) {
    return {
      id: address.id,
      label: address.label,
      subCity: address.subCity,
      woreda: address.woreda,
      landmark: address.landmark,
      directions: address.directions,
      contactName: address.contactName,
      contactPhone: address.contactPhone,
      isDefault: address.isDefault,
    };
  }
}
