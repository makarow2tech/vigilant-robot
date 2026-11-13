import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import * as forum from "@/lib/forum.server";

// Sunucu işlevleri: istemci yalnızca bunları çağırır, veritabanına doğrudan erişmez.
// Herkese açık okumalar ziyaretçinin kendi kimliğiyle yapılır (ziyaretçi başına istek sınırı),
// yazmalar ve gizli kayıtlar servis rolüyle yürür. Tüm içerik şifreli blok halinde taşınır.

const asUser = (context) => context.getBase44();
const asService = (context) => context.getBase44().asServiceRole;

// Okuma: önce ziyaretçinin kendi kimliğiyle denenir; oturumsuz ziyaretçiye platform
// okuma izni vermezse aynı sorgu servis rolüyle tekrarlanır ki site herkese açık kalsın.
async function readWith(context, run) {
  try {
    return await run(asUser(context));
  } catch (error) {
    return run(asService(context));
  }
}

// --- okumalar ---------------------------------------------------------------
export const getSiteConfig = createServerFn({ method: "GET" }).handler(async ({ context }) => ({
  config: await forum.readConfig(asService(context)),
}));

export const listTopics = createServerFn({ method: "GET" }).handler(async ({ context }) =>
  forum.listTopics(asService(context))
);

export const listFeed = createServerFn({ method: "GET" })
  .validator(
    z.object({
      sort: z.string().max(8).optional(),
      topicSlug: z.string().max(60).optional(),
      q: z.string().max(120).optional(),
      limit: z.number().int().min(1).max(50).optional(),
      cursor: z.string().max(12).optional(),
    })
  )
  .handler(async ({ data, context }) => readWith(context, (db) => forum.listFeed(db, data)));

export const getPost = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().max(64) }))
  .handler(async ({ data, context }) => readWith(context, (db) => forum.getPost(db, data.id)));

export const listComments = createServerFn({ method: "GET" })
  .validator(z.object({ postId: z.string().max(64) }))
  .handler(async ({ data, context }) => readWith(context, (db) => forum.listComments(db, data.postId)));

export const myState = createServerFn({ method: "GET" })
  .validator(
    z.object({
      voterKey: z.string().max(80),
      ids: z.array(z.string().max(64)).max(200),
    })
  )
  .handler(async ({ data, context }) => readWith(context, (db) => forum.myState(db, data)));

export const listBookmarks = createServerFn({ method: "GET" })
  .validator(z.object({ voterKey: z.string().max(80) }))
  .handler(async ({ data, context }) => readWith(context, (db) => forum.listBookmarks(db, data.voterKey)));

export const getMyVault = createServerFn({ method: "GET" })
  .validator(z.object({ ownerKey: z.string().max(80) }))
  .handler(async ({ data, context }) => forum.getMyVault(asService(context), data.ownerKey));

export const getMyProfile = createServerFn({ method: "GET" })
  .validator(z.object({ ownerKey: z.string().max(80) }))
  .handler(async ({ data, context }) => forum.getMyProfile(asService(context), data.ownerKey));

// --- yazmalar --------------------------------------------------------------
const cipher = z.string().min(1).max(240000);

export const createPost = createServerFn({ method: "POST" })
  .validator(
    z.object({
      title_cipher: cipher,
      body_cipher: cipher,
      envelopes: cipher,
      visibility: z.enum(["public", "private"]),
      owner_public_key: z.string().max(4000).optional(),
      topic_id: z.string().max(64).optional(),
      topic_slug: z.string().max(60).optional(),
      topic_name: z.string().max(60).optional(),
      flair: z.string().max(24).optional(),
      attachment_url: z.string().max(600).optional(),
      attachment_name: z.string().max(120).optional(),
      attachment_type: z.string().max(80).optional(),
      anon_id: z.string().min(6).max(80),
      anon_secret_hash: z.string().min(16).max(128),
      author_name: z.string().max(40),
    })
  )
  .handler(async ({ data, context }) => forum.createPost(asService(context), data));

export const deletePost = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().max(64), anonSecretHash: z.string().max(128) }))
  .handler(async ({ data, context }) => forum.deletePost(asService(context), data));

export const createComment = createServerFn({ method: "POST" })
  .validator(
    z.object({
      post_id: z.string().max(64),
      parent_id: z.string().max(64).optional(),
      body_cipher: cipher,
      envelopes: cipher,
      depth: z.number().int().min(0).max(10).optional(),
      anon_id: z.string().min(6).max(80),
      anon_secret_hash: z.string().min(16).max(128),
      author_name: z.string().max(40),
    })
  )
  .handler(async ({ data, context }) => forum.createComment(asService(context), data));

export const deleteComment = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().max(64), anonSecretHash: z.string().max(128) }))
  .handler(async ({ data, context }) => forum.deleteComment(asService(context), data));

export const vote = createServerFn({ method: "POST" })
  .validator(
    z.object({
      targetType: z.enum(["post", "comment"]),
      targetId: z.string().max(64),
      voterKey: z.string().min(4).max(80),
      value: z.number().int().min(-1).max(1),
    })
  )
  .handler(async ({ data, context }) => forum.vote(asService(context), data));

export const toggleBookmark = createServerFn({ method: "POST" })
  .validator(z.object({ postId: z.string().max(64), voterKey: z.string().min(4).max(80) }))
  .handler(async ({ data, context }) => forum.toggleBookmark(asService(context), data));

export const createTopic = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().min(2).max(60),
      description: z.string().max(400).optional(),
      accent: z.string().max(16).optional(),
      icon: z.string().max(4).optional(),
      rules: z.string().max(2000).optional(),
    })
  )
  .handler(async ({ data, context }) => forum.createTopic(asService(context), data));

export const saveMyVault = createServerFn({ method: "POST" })
  .validator(
    z.object({
      owner_key: z.string().min(6).max(80),
      public_key: z.string().min(20).max(4000),
      vault: z.string().min(20).max(20000),
    })
  )
  .handler(async ({ data, context }) => forum.saveMyVault(asService(context), data));