-- CreateTable
CREATE TABLE "sources" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "summary_de" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'Deutsch',
    "date_added" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source_query" TEXT,
    "relevance_score" INTEGER NOT NULL DEFAULT 5,
    "corrected_score" INTEGER,
    "star_rating" BOOLEAN NOT NULL DEFAULT false,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_queue" (
    "id" SERIAL NOT NULL,
    "query" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "date_added" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_processed" TIMESTAMP(3),
    "error_message" TEXT,
    "results_count" INTEGER NOT NULL DEFAULT 0,
    "is_ai_generated" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "search_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tag_cooccurrence" (
    "id" SERIAL NOT NULL,
    "tag1" TEXT NOT NULL,
    "tag2" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tag_cooccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sources_url_key" ON "sources"("url");

-- CreateIndex
CREATE INDEX "sources_url_idx" ON "sources"("url");

-- CreateIndex
CREATE INDEX "sources_language_idx" ON "sources"("language");

-- CreateIndex
CREATE INDEX "sources_star_rating_idx" ON "sources"("star_rating");

-- CreateIndex
CREATE INDEX "search_queue_status_idx" ON "search_queue"("status");

-- CreateIndex
CREATE INDEX "tag_cooccurrence_tag1_idx" ON "tag_cooccurrence"("tag1");

-- CreateIndex
CREATE INDEX "tag_cooccurrence_tag2_idx" ON "tag_cooccurrence"("tag2");

-- CreateIndex
CREATE UNIQUE INDEX "tag_cooccurrence_tag1_tag2_key" ON "tag_cooccurrence"("tag1", "tag2");
