-- Crowdspace PostgreSQL schema

CREATE TABLE creators (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  bio TEXT,
  location TEXT,
  website TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  creator_id INTEGER NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  platform TEXT NOT NULL,
  status TEXT NOT NULL,
  url TEXT NOT NULL,
  launch_date DATE,
  end_date DATE,
  goal_amount NUMERIC,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  embedding JSONB
);

ALTER TABLE projects
  ADD CONSTRAINT projects_status_check
  CHECK (status IN ('going', 'completed', 'upcoming'));

ALTER TABLE projects
  ADD CONSTRAINT projects_platform_check
  CHECK (platform IN ('kickstarter', 'indiegogo', 'gofundme'));

CREATE TABLE backers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  country TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE financials (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  total_pledged NUMERIC,
  backer_count INTEGER,
  average_pledge NUMERIC,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE backer_projects (
  id SERIAL PRIMARY KEY,
  backer_id INTEGER NOT NULL REFERENCES backers(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  amount_pledged NUMERIC NOT NULL,
  pledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
