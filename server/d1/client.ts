// ======================================================================
// Cloudflare D1 Client & Lifecycle Manager
// Bridges Cloudflare Workers env.DB and local SQLite runtime
// ======================================================================

import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { D1Database } from './types.ts';
import { NodeD1Database } from './nodeAdapter.ts';
import { DatabaseSync } from 'node:sqlite';

let currentD1: D1Database | null = null;
let isInitialized = false;

export function setD1Database(database: D1Database): void {
  currentD1 = database;
}

export function getD1Database(): D1Database {
  if (!currentD1) {
    // Local Node.js SQLite fallback (persisted in data/d1_local.sqlite)
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const sqlitePath = path.join(dataDir, 'd1_local.sqlite');
    const sqlite = new DatabaseSync(sqlitePath);
    currentD1 = new NodeD1Database(sqlite);
  }
  return currentD1;
}

/**
 * Initializes D1 schema and seeds baseline catalog & administrative credentials
 */
export async function initializeD1Database(db?: D1Database): Promise<void> {
  if (isInitialized) return;
  const targetDb = db || getD1Database();

  try {
    // Execute D1 schema DDL
    const schemaPath = path.join(process.cwd(), 'migrations', '0001_initial_schema.sql');
    let schemaSql = '';
    if (fs.existsSync(schemaPath)) {
      schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    } else {
      const fallbackPath = path.join(process.cwd(), 'server', 'd1_schema.sql');
      if (fs.existsSync(fallbackPath)) {
        schemaSql = fs.readFileSync(fallbackPath, 'utf-8');
      }
    }

    if (schemaSql) {
      await targetDb.exec(schemaSql);
    }

    // Check if initial users exist
    const userCheck = await targetDb
      .prepare('SELECT COUNT(*) as count FROM users')
      .first<{ count: number }>();

    if (!userCheck || Number(userCheck.count) === 0) {
      await seedBaselineD1Data(targetDb);
    }

    isInitialized = true;
  } catch (err: any) {
    console.error('[D1 Database] Initialization error:', err);
    throw err;
  }
}

/**
 * Seeds initial categories, courses, chapters, lessons, and test credentials
 */
async function seedBaselineD1Data(db: D1Database): Promise<void> {
  console.log('[D1 Database] Seeding initial database catalog and credentials...');

  const salt = await bcrypt.genSalt(10);
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminSecure2026!';
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@nextgenlearn.com';
  const adminHash = await bcrypt.hash(adminPassword, salt);
  const studentHash = await bcrypt.hash('StudentSecure2026!', salt);

  // 1. Seed Users
  await db
    .prepare(
      `INSERT OR IGNORE INTO users (id, email, password_hash, name, role, avatar_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, DATETIME('now'), DATETIME('now'))`
    )
    .bind(
      'user_admin_01',
      adminEmail.toLowerCase().trim(),
      adminHash,
      'Alexander Wright',
      'admin',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    )
    .run();

  await db
    .prepare(
      `INSERT OR IGNORE INTO users (id, email, password_hash, name, role, avatar_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, DATETIME('now'), DATETIME('now'))`
    )
    .bind(
      'user_student_01',
      'student@example.com',
      studentHash,
      'Sarah Chen',
      'student',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
    )
    .run();

  // 2. Seed Categories
  const categories = [
    {
      id: 'cat_web',
      name: 'Full-Stack Web',
      slug: 'full-stack-web',
      description: 'Master React, Next.js, Node.js, TypeScript, and modern front-end architectures.',
      icon: 'Code2',
    },
    {
      id: 'cat_cloud',
      name: 'Cloud & DevOps',
      slug: 'cloud-and-devops',
      description: 'Deploy resilient systems with Cloudflare Workers, Docker, Kubernetes & AWS.',
      icon: 'Cloud',
    },
    {
      id: 'cat_ai',
      name: 'AI Engineering',
      slug: 'ai-engineering',
      description: 'Build production-ready LLM pipelines, autonomous agents, and RAG systems.',
      icon: 'Sparkles',
    },
    {
      id: 'cat_systems',
      name: 'System Design',
      slug: 'system-design',
      description: 'Distributed databases, message brokers, caching, and ultra-high-scale architecture.',
      icon: 'Cpu',
    },
  ];

  for (const cat of categories) {
    await db
      .prepare(
        `INSERT OR IGNORE INTO categories (id, name, slug, description, icon)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(cat.id, cat.name, cat.slug, cat.description, cat.icon)
      .run();
  }

  // 3. Seed Courses
  const courses = [
    {
      id: 'course_nextjs_ts',
      slug: 'complete-fullstack-nextjs-typescript',
      title: 'Full-Stack Next.js 15 & Production TypeScript Architecture',
      subtitle: 'Build ultra-fast, type-safe enterprise applications with server components, streaming SSR, and edge caching.',
      description: 'This comprehensive course takes you from foundational Next.js concepts to deploying mission-critical, enterprise-grade web applications. You will learn Server Actions, streaming suspense boundaries, database transactions, robust authentication, and high-performance Tailwind styling.',
      instructor_name: 'Alexander Wright',
      instructor_title: 'Staff Architect & Ex-Vercel Tech Lead',
      instructor_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      instructor_bio: 'Alexander has led infrastructure and frontend engineering teams for over 12 years, mentoring thousands of engineers worldwide.',
      thumbnail_url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&auto=format&fit=crop&q=80',
      price_inr: 2499,
      original_price_inr: 7999,
      level: 'Intermediate',
      category_id: 'cat_web',
      is_published: 1,
      duration_hours: 18.5,
      rating: 4.95,
      review_count: 428,
      what_you_will_learn: JSON.stringify([
        'Architect enterprise full-stack apps with React 19 and Next.js 15 App Router',
        'Type-safe end-to-end data contracts using TypeScript and Zod',
        'Edge database transactions, migrations, and caching with Cloudflare D1',
        'Secure cookie/JWT session management and role-based access control',
        'Optimistic updates and streaming Server-Sent Events',
        'Production Cloudflare Pages and Workers edge deployment pipeline'
      ]),
      requirements: JSON.stringify([
        'Basic familiarity with JavaScript (ES6+) and modern React hooks',
        'Node.js 18+ installed on your local machine',
        'A code editor like VS Code'
      ]),
      faqs: JSON.stringify([
        {
          question: 'Is this course suitable for beginners in Next.js?',
          answer: 'Yes! While basic React knowledge is recommended, we start with fundamental concepts before tackling advanced architectural patterns.'
        },
        {
          question: 'Do I get lifetime access to all course updates?',
          answer: 'Absolutely. Once purchased, you receive lifetime access including all future revisions, downloadable source repositories, and discussion access.'
        },
        {
          question: 'Can I stream videos in HD on mobile devices?',
          answer: 'Yes, all videos are streamed through Cloudflare Stream with adaptive bitrate streaming (HLS/DASH) for crisp playback on all devices.'
        }
      ]),
    },
    {
      id: 'course_cloudflare_stream',
      slug: 'cloudflare-workers-serverless-masterclass',
      title: 'Cloudflare Workers, Pages & Serverless Edge Computing',
      subtitle: 'Build and scale global microservices running on 300+ edge nodes with sub-10ms response times.',
      description: 'Edge computing is transforming backend engineering. Master Cloudflare Workers, KV, D1 SQL, R2 object storage, Cloudflare Stream video processing, and WebSockets without managing servers.',
      instructor_name: 'Elena Rostova',
      instructor_title: 'Cloud Infrastructure Director',
      instructor_avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
      instructor_bio: 'Elena specializes in globally distributed systems, edge serverless architecture, and low-latency streaming protocols.',
      thumbnail_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80',
      price_inr: 1999,
      original_price_inr: 5999,
      level: 'Advanced',
      category_id: 'cat_cloud',
      is_published: 1,
      duration_hours: 14.0,
      rating: 4.88,
      review_count: 215,
      what_you_will_learn: JSON.stringify([
        'Deploy serverless APIs across Cloudflare 300+ global edge datacenters',
        'Integrate Cloudflare Stream for secure signed video delivery and token authorization',
        'Harness Cloudflare D1 (SQLite at the edge) and KV with atomic operations',
        'Implement Web Crypto API for zero-trust token verification and rate limiting',
        'Configure custom domains, SSL/TLS, and automated GitHub Actions deployments'
      ]),
      requirements: JSON.stringify([
        'Foundational knowledge of TypeScript and HTTP APIs',
        'A free Cloudflare account for hands-on deployment'
      ]),
      faqs: JSON.stringify([
        {
          question: 'Does this cover Cloudflare Stream video authorization?',
          answer: 'Yes! An entire dedicated chapter is dedicated to Cloudflare Stream, signed playback tokens, webhooks, and DRM protections.'
        }
      ]),
    },
    {
      id: 'course_ai_engineering',
      slug: 'production-ai-engineering-rag-agents',
      title: 'Production AI Engineering: Multimodal Agents, RAG & LLMs',
      subtitle: 'Design, evaluate, and deploy autonomous LLM systems, function calling workflows, and vector knowledge bases.',
      description: 'Move beyond toy ChatGPT wrappers. Learn to build production-grade AI systems with Gemini, semantic embedding search, graph-grounded retrieval, real-time audio reasoning, and agent tool execution.',
      instructor_name: 'Dr. Marcus Vance',
      instructor_title: 'Head of Applied AI Research',
      instructor_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
      instructor_bio: 'Dr. Vance holds a Ph.D. in Computer Science and has published extensive research in Retrieval-Augmented Generation.',
      thumbnail_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
      price_inr: 2999,
      original_price_inr: 8999,
      level: 'Intermediate',
      category_id: 'cat_ai',
      is_published: 1,
      duration_hours: 22.0,
      rating: 4.97,
      review_count: 512,
      what_you_will_learn: JSON.stringify([
        'Design resilient agent loops with tool invocation and error recovery',
        'Build multi-stage RAG pipelines with hybrid keyword and vector dense search',
        'Evaluate LLM hallucinations systematically with automated benchmark suites',
        'Deploy Gemini 2.5 models with server-side API proxy security'
      ]),
      requirements: JSON.stringify([
        'Intermediate Python or TypeScript programming skills',
        'Basic familiarity with REST APIs and prompt concepts'
      ]),
      faqs: JSON.stringify([
        {
          question: 'Are API keys included?',
          answer: 'We guide you through setting up Gemini and Cloudflare API keys safely using server-side environment variables.'
        }
      ]),
    },
    {
      id: 'course_system_design',
      slug: 'system-design-distributed-systems-scale',
      title: 'System Design Interview & Distributed Architecture at Scale',
      subtitle: 'Architect mission-critical distributed systems that survive multi-region outages and 100M+ active users.',
      description: 'Master the principles of designing high-scale, resilient systems. Learn database sharding, CAP theorem trade-offs, consistent hashing, distributed locks, rate limiters, and idempotency keys.',
      instructor_name: 'Devin Thorne',
      instructor_title: 'Principal Systems Architect',
      instructor_avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
      instructor_bio: 'Devin has designed distributed telemetry and banking backends handling over 500,000 queries per second.',
      thumbnail_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&auto=format&fit=crop&q=80',
      price_inr: 3499,
      original_price_inr: 9999,
      level: 'Advanced',
      category_id: 'cat_systems',
      is_published: 1,
      duration_hours: 26.5,
      rating: 4.92,
      review_count: 389,
      what_you_will_learn: JSON.stringify([
        'Deconstruct real-world architectures: YouTube, Uber, Stripe payments, and WhatsApp',
        'Distributed consensus protocols: Raft, Paxos, and 2-Phase Commit',
        'Caching topologies: Cache-aside, Read-through, Write-behind, and Redis clusters',
        'Event-driven architecture with Kafka, RabbitMQ, and idempotency guarantees'
      ]),
      requirements: JSON.stringify([
        'Experience building backend services or microservices',
        'Basic understanding of networking, TCP/IP, and relational databases'
      ]),
      faqs: JSON.stringify([
        {
          question: 'Is this focused on interview prep or practical production systems?',
          answer: 'Both! Every architectural pattern is taught through the lens of real production incidents, followed by how to present it in high-level staff engineering interviews.'
        }
      ]),
    }
  ];

  for (const c of courses) {
    await db
      .prepare(
        `INSERT OR IGNORE INTO courses (
          id, slug, title, subtitle, description, instructor_name, instructor_title,
          instructor_avatar, instructor_bio, thumbnail_url, price_inr, original_price_inr,
          level, category_id, is_published, duration_hours, rating, review_count,
          what_you_will_learn, requirements, faqs, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATETIME('now'), DATETIME('now'))`
      )
      .bind(
        c.id,
        c.slug,
        c.title,
        c.subtitle,
        c.description,
        c.instructor_name,
        c.instructor_title,
        c.instructor_avatar,
        c.instructor_bio,
        c.thumbnail_url,
        c.price_inr,
        c.original_price_inr,
        c.level,
        c.category_id,
        c.is_published,
        c.duration_hours,
        c.rating,
        c.review_count,
        c.what_you_will_learn,
        c.requirements,
        c.faqs
      )
      .run();
  }

  // 4. Seed Chapters
  const chapters = [
    { id: 'chap_next_01', course_id: 'course_nextjs_ts', title: 'Module 1: Foundations & Architecture Blueprint', sort_order: 1 },
    { id: 'chap_next_02', course_id: 'course_nextjs_ts', title: 'Module 2: Server Actions & Edge Persistence', sort_order: 2 },
    { id: 'chap_cloud_01', course_id: 'course_cloudflare_stream', title: 'Module 1: Cloudflare Edge Compute & Workers Runtime', sort_order: 1 },
    { id: 'chap_cloud_02', course_id: 'course_cloudflare_stream', title: 'Module 2: Cloudflare Stream & Media Delivery Pipelines', sort_order: 2 },
    { id: 'chap_ai_01', course_id: 'course_ai_engineering', title: 'Module 1: LLM Foundations & Prompt Engineering at Scale', sort_order: 1 },
    { id: 'chap_ai_02', course_id: 'course_ai_engineering', title: 'Module 2: Autonomous Tool Calling & Multimodal Agents', sort_order: 2 },
    { id: 'chap_sys_01', course_id: 'course_system_design', title: 'Module 1: High-Availability Database Replication & Caching', sort_order: 1 },
  ];

  for (const ch of chapters) {
    await db
      .prepare(
        `INSERT OR IGNORE INTO chapters (id, course_id, title, sort_order, created_at)
         VALUES (?, ?, ?, ?, DATETIME('now'))`
      )
      .bind(ch.id, ch.course_id, ch.title, ch.sort_order)
      .run();
  }

  // 5. Seed Lessons (with free previews and Cloudflare Stream video IDs)
  const lessons = [
    {
      id: 'les_next_01',
      chapter_id: 'chap_next_01',
      course_id: 'course_nextjs_ts',
      title: '01. Course Introduction & Architectural Blueprint',
      description: 'Overview of modern full-stack web applications, architectural design choices, and setting up the development workspace.',
      duration_seconds: 480,
      is_free_preview: 1,
      sort_order: 1,
      cloudflare_video_id: 'cf_stream_demo_nextjs_intro',
      cloudflare_playback_hls: 'https://videodelivery.net/cf_stream_demo_nextjs_intro/manifest/video.m3u8',
      status: 'ready',
      is_published: 1,
    },
    {
      id: 'les_next_02',
      chapter_id: 'chap_next_01',
      course_id: 'course_nextjs_ts',
      title: '02. Strict TypeScript Configuration & Project Structure',
      description: 'Configuring strict TypeScript compiler flags, path aliases, shared schemas, and ESLint rules.',
      duration_seconds: 720,
      is_free_preview: 1,
      sort_order: 2,
      cloudflare_video_id: 'cf_stream_demo_ts_config',
      cloudflare_playback_hls: 'https://videodelivery.net/cf_stream_demo_ts_config/manifest/video.m3u8',
      status: 'ready',
      is_published: 1,
    },
    {
      id: 'les_next_03',
      chapter_id: 'chap_next_01',
      course_id: 'course_nextjs_ts',
      title: '03. Server Components vs Client Components Deep Dive',
      description: 'Understanding the React boundary model, serialized props, streaming suspense, and bundle optimization.',
      duration_seconds: 960,
      is_free_preview: 0,
      sort_order: 3,
      cloudflare_video_id: 'cf_stream_demo_rsc_deepdive',
      cloudflare_playback_hls: 'https://videodelivery.net/cf_stream_demo_rsc_deepdive/manifest/video.m3u8',
      status: 'ready',
      is_published: 1,
    },
    {
      id: 'les_next_04',
      chapter_id: 'chap_next_02',
      course_id: 'course_nextjs_ts',
      title: '04. Building Type-Safe Server Actions with Zod Validation',
      description: 'Executing secure database mutations directly from components with automatic input validation and error states.',
      duration_seconds: 1140,
      is_free_preview: 0,
      sort_order: 1,
      cloudflare_video_id: 'cf_stream_demo_server_actions',
      status: 'ready',
      is_published: 1,
    },
    {
      id: 'les_next_05',
      chapter_id: 'chap_next_02',
      course_id: 'course_nextjs_ts',
      title: '05. Cloudflare D1 SQL Transactions & Atomic Row Locking',
      description: 'Preventing race conditions during high-volume operations using edge SQLite transactions and optimistic concurrency.',
      duration_seconds: 1380,
      is_free_preview: 0,
      sort_order: 2,
      cloudflare_video_id: 'cf_stream_demo_d1_transactions',
      status: 'ready',
      is_published: 1,
    },
    {
      id: 'les_cloud_01',
      chapter_id: 'chap_cloud_01',
      course_id: 'course_cloudflare_stream',
      title: '01. Cloudflare Workers Global Edge Network Architecture',
      description: 'How Cloudflare executes JavaScript in V8 isolates across 300+ cities with zero cold starts.',
      duration_seconds: 540,
      is_free_preview: 1,
      sort_order: 1,
      cloudflare_video_id: 'cf_stream_demo_edge_intro',
      cloudflare_playback_hls: 'https://videodelivery.net/cf_stream_demo_edge_intro/manifest/video.m3u8',
      status: 'ready',
      is_published: 1,
    },
    {
      id: 'les_cloud_02',
      chapter_id: 'chap_cloud_01',
      course_id: 'course_cloudflare_stream',
      title: '02. Cloudflare D1: SQLite Database at the Edge',
      description: 'Querying, migrating, and optimizing serverless SQLite databases distributed globally with sub-millisecond local reads.',
      duration_seconds: 900,
      is_free_preview: 0,
      sort_order: 2,
      cloudflare_video_id: 'cf_stream_demo_d1_intro',
      status: 'ready',
      is_published: 1,
    },
    {
      id: 'les_cloud_03',
      chapter_id: 'chap_cloud_02',
      course_id: 'course_cloudflare_stream',
      title: '03. Cloudflare Stream Signed URLs & Token DRM Authorization',
      description: 'Protecting paid video content with ephemeral signed URLs, customer subdomains, and webhook processing.',
      duration_seconds: 1260,
      is_free_preview: 0,
      sort_order: 1,
      cloudflare_video_id: 'cf_stream_demo_drm_tokens',
      status: 'ready',
      is_published: 1,
    },
    {
      id: 'les_ai_01',
      chapter_id: 'chap_ai_01',
      course_id: 'course_ai_engineering',
      title: '01. The Modern AI Stack: Foundations & Reasoning Models',
      description: 'High-level introduction to generative intelligence, embeddings, and multimodal architectures.',
      duration_seconds: 620,
      is_free_preview: 1,
      sort_order: 1,
      cloudflare_video_id: 'cf_stream_demo_ai_stack',
      cloudflare_playback_hls: 'https://videodelivery.net/cf_stream_demo_ai_stack/manifest/video.m3u8',
      status: 'ready',
      is_published: 1,
    },
    {
      id: 'les_sys_01',
      chapter_id: 'chap_sys_01',
      course_id: 'course_system_design',
      title: '01. Distributed Caching & Cache-Aside Invalidation Strategies',
      description: 'High-concurrency caching topologies, dogpiling mitigation, and cache-aside patterns.',
      duration_seconds: 840,
      is_free_preview: 1,
      sort_order: 1,
      cloudflare_video_id: 'cf_stream_demo_sys_cache',
      cloudflare_playback_hls: 'https://videodelivery.net/cf_stream_demo_sys_cache/manifest/video.m3u8',
      status: 'ready',
      is_published: 1,
    },
  ];

  for (const l of lessons) {
    await db
      .prepare(
        `INSERT OR IGNORE INTO lessons (
          id, chapter_id, course_id, title, description, duration_seconds,
          is_free_preview, sort_order, cloudflare_video_id, cloudflare_playback_hls,
          status, is_published, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATETIME('now'))`
      )
      .bind(
        l.id,
        l.chapter_id,
        l.course_id,
        l.title,
        l.description || null,
        l.duration_seconds,
        l.is_free_preview,
        l.sort_order,
        l.cloudflare_video_id || null,
        l.cloudflare_playback_hls || null,
        l.status,
        l.is_published
      )
      .run();
  }

  // 6. Seed Sample Purchase for Default Student
  await db
    .prepare(
      `INSERT OR IGNORE INTO purchases (
        id, user_id, course_id, razorpay_order_id, razorpay_payment_id,
        amount_inr, currency, payment_status, verification_status, purchase_date, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, DATETIME('now', '-5 days'), DATETIME('now', '-5 days'))`
    )
    .bind(
      'purch_sample_01',
      'user_student_01',
      'course_nextjs_ts',
      'order_test_demo_01',
      'pay_test_demo_01',
      2499,
      'INR',
      'success',
      'verified'
    )
    .run();

  await db
    .prepare(
      `INSERT OR IGNORE INTO payments (
        id, purchase_id, user_id, course_id, razorpay_order_id, razorpay_payment_id,
        razorpay_signature, amount_inr, currency, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATETIME('now', '-5 days'))`
    )
    .bind(
      'pay_rec_01',
      'purch_sample_01',
      'user_student_01',
      'course_nextjs_ts',
      'order_test_demo_01',
      'pay_test_demo_01',
      'sig_verified_demo_mock_01',
      2499,
      'INR',
      'captured'
    )
    .run();

  // 7. Seed Sample Watch Progress
  await db
    .prepare(
      `INSERT OR IGNORE INTO watch_progress (
        id, user_id, course_id, lesson_id, last_watched_position_seconds, duration_seconds, is_completed, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, DATETIME('now', '-2 days'))`
    )
    .bind('prog_01', 'user_student_01', 'course_nextjs_ts', 'les_next_01', 480, 480, 1)
    .run();

  await db
    .prepare(
      `INSERT OR IGNORE INTO watch_progress (
        id, user_id, course_id, lesson_id, last_watched_position_seconds, duration_seconds, is_completed, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, DATETIME('now', '-1 days'))`
    )
    .bind('prog_02', 'user_student_01', 'course_nextjs_ts', 'les_next_02', 420, 720, 0)
    .run();

  console.log('[D1 Database] Initial seed successfully populated in Cloudflare D1.');
}
