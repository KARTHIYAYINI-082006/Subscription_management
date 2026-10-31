import { Router } from 'express';
import type { Role } from '@prisma/client';
import type { z, ZodTypeAny } from 'zod';
import { prisma } from './prisma';
import { authorize } from '../middleware/auth';
import { notFound, paged, parseList, searchWhere } from './http';

type Model = 'tax' | 'product' | 'plan' | 'discount' | 'quotationTemplate';

interface CrudOptions<S extends ZodTypeAny> {
  model: Model;
  schema: S;
  searchFields: string[];
  readRoles: Role[];
  writeRoles: Role[];
  include?: object;
  orderBy?: object;
  /** Maps validated input to Prisma data (e.g. nested relations). */
  toData?: (input: z.infer<S>, mode: 'create' | 'update') => object;
}

/** Generic paginated CRUD router for simple catalogue models. */
export function crudRouter<S extends ZodTypeAny>(opts: CrudOptions<S>) {
  const router = Router();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const delegate = (prisma as any)[opts.model];
  const { include, searchFields } = opts;
  const orderBy = opts.orderBy ?? { createdAt: 'desc' };
  const toData = opts.toData ?? ((input: object) => input);
  const canRead = authorize(...opts.readRoles);
  const canWrite = authorize(...opts.writeRoles);

  router.get('/', canRead, async (req, res) => {
    const { skip, take, page, pageSize, search } = parseList(req);
    const where = searchWhere(search, searchFields);
    const [data, total] = await Promise.all([
      delegate.findMany({ where, include, orderBy, skip, take }),
      delegate.count({ where }),
    ]);
    res.json(paged(data, total, page, pageSize));
  });

  router.get('/:id', canRead, async (req, res) => {
    const record = await delegate.findUnique({ where: { id: req.params.id }, include });
    if (!record) throw notFound();
    res.json(record);
  });

  router.post('/', canWrite, async (req, res) => {
    const data = toData(opts.schema.parse(req.body), 'create');
    res.status(201).json(await delegate.create({ data, include }));
  });

  router.put('/:id', canWrite, async (req, res) => {
    const data = toData(opts.schema.parse(req.body), 'update');
    res.json(await delegate.update({ where: { id: req.params.id }, data, include }));
  });

  router.delete('/:id', canWrite, async (req, res) => {
    await delegate.delete({ where: { id: req.params.id } });
    res.status(204).end();
  });

  return router;
}

/** Prisma many-to-many relation payload for a list of ids. */
export function relateIds(ids: string[], mode: 'create' | 'update') {
  const refs = ids.map((id) => ({ id }));
  return mode === 'create' ? { connect: refs } : { set: refs };
}
