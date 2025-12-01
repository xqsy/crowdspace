-- Crowdspace seed data

TRUNCATE TABLE backer_projects, financials, projects, backers, creators RESTART IDENTITY CASCADE;

-- Creators
INSERT INTO creators (id, name, bio, location, website) VALUES
  (1, 'LumenLab', 'Designs resilient energy solutions for coastal communities.', 'San Diego, USA', 'https://lumenlab.example'),
  (2, 'Nova Studio', 'Wearable tech for focus and wellbeing.', 'Austin, USA', 'https://novastudio.example'),
  (3, 'OpenField Co-op', 'Community-owned sustainable housing projects.', 'Portland, USA', 'https://openfield.example'),
  (4, 'BrightLabs', 'STEM education kits for classrooms.', 'Boston, USA', 'https://brightlabs.example'),
  (5, 'Hydra Urban', 'Urban agriculture and vertical farming concepts.', 'Chicago, USA', 'https://hydraurban.example'),
  (6, 'Guild of Coders', 'Open-source preservation of digital art and games.', 'Berlin, Germany', 'https://guildofcoders.example'),
  (7, 'SolRise Collective', 'Solar-powered community infrastructure projects.', 'Barcelona, Spain', 'https://solrise.example'),
  (8, 'Horizon Learning', 'Remote learning tools for low-connectivity regions.', 'Nairobi, Kenya', 'https://horizonlearning.example'),
  (9, 'Aurora Health Initiative', 'Accessible health tech for underserved populations.', 'Stockholm, Sweden', 'https://aurorahealth.example'),
  (10, 'NextGen Play', 'Educational toys and games for kids.', 'Toronto, Canada', 'https://nextgenplay.example');

-- Projects (20 examples)
INSERT INTO projects (id, creator_id, title, description, category, platform, status, url, launch_date, end_date, goal_amount, currency)
VALUES
  (1, 1, 'Solstice Microgrid Expansion', 'Bringing resilient microgrids to coastal towns affected by seasonal power outages.', 'Environment', 'kickstarter', 'going', 'https://www.kickstarter.com/projects/solstice-microgrid', '2025-01-05', '2025-03-05', 400000, 'USD'),
  (2, 2, 'PulseNote — Focus Wearable', 'A distraction-reducing wearable that translates heart-rate variability into gentle haptic cues.', 'Technology', 'indiegogo', 'going', 'https://www.indiegogo.com/projects/pulsenote-wearable', '2025-02-01', '2025-03-30', 200000, 'USD'),
  (3, 3, 'Evergreen Passive Cabin', 'Prefab cabins with zero-energy heating, built for remote researchers and park rangers.', 'Environment', 'gofundme', 'completed', 'https://www.gofundme.com/f/evergreen-passive-cabin', '2024-09-10', '2024-11-10', 180000, 'USD'),
  (4, 4, 'STEMbot Classroom Kit', 'Modular robotics curriculum that lets students prototype, code, and iterate within one lesson.', 'Education', 'kickstarter', 'upcoming', 'https://www.kickstarter.com/projects/stembot-classroom-kit', '2025-04-01', '2025-05-15', 150000, 'USD'),
  (5, 6, 'Open Archive Commons', 'A public toolkit that preserves indie games and interactive art for classrooms worldwide.', 'Art', 'gofundme', 'completed', 'https://www.gofundme.com/f/open-archive-commons', '2024-05-20', '2024-07-20', 85000, 'USD'),
  (6, 5, 'Skylight Vertical Farms', 'Mobile vertical farm pods that bring fresh produce to dense neighborhoods.', 'Environment', 'indiegogo', 'upcoming', 'https://www.indiegogo.com/projects/skylight-vertical-farms', '2025-03-10', '2025-05-10', 220000, 'USD'),
  (7, 7, 'SolarSafe Streetlights', 'Solar-powered streetlights with battery backup for rural roads.', 'Environment', 'kickstarter', 'going', 'https://www.kickstarter.com/projects/solarsafe-streetlights', '2025-01-15', '2025-03-20', 120000, 'USD'),
  (8, 7, 'HarborWave Desalination', 'Wave-powered micro desalination units for island communities.', 'Environment', 'indiegogo', 'going', 'https://www.indiegogo.com/projects/harborwave-desalination', '2025-02-10', '2025-04-10', 260000, 'USD'),
  (9, 8, 'Classroom in a Backpack', 'Offline-first learning kit with tablet, projector, and curated curriculum.', 'Education', 'gofundme', 'going', 'https://www.gofundme.com/f/classroom-in-a-backpack', '2024-12-01', '2025-02-01', 90000, 'USD'),
  (10, 8, 'RadioBridge Lessons', 'Interactive radio-based lessons for regions without stable internet.', 'Education', 'kickstarter', 'completed', 'https://www.kickstarter.com/projects/radiobridge-lessons', '2024-06-01', '2024-08-01', 60000, 'USD'),
  (11, 9, 'Aurora Home Diagnostics Kit', 'Affordable at-home diagnostics toolkit for chronic conditions.', 'Health', 'indiegogo', 'going', 'https://www.indiegogo.com/projects/aurora-diagnostics-kit', '2025-01-25', '2025-03-25', 250000, 'USD'),
  (12, 9, 'Community Telehealth Van', 'A mobile telehealth clinic equipped with remote diagnostics tools.', 'Health', 'gofundme', 'going', 'https://www.gofundme.com/f/community-telehealth-van', '2024-11-15', '2025-01-15', 130000, 'USD'),
  (13, 10, 'StoryBlocks Adventure Set', 'Modular storytelling blocks that teach narrative structure to kids.', 'Games', 'kickstarter', 'going', 'https://www.kickstarter.com/projects/storyblocks-adventures', '2025-02-05', '2025-03-31', 50000, 'USD'),
  (14, 10, 'CodeQuest Card Game', 'A cooperative card game that introduces basic programming logic.', 'Games', 'indiegogo', 'completed', 'https://www.indiegogo.com/projects/codequest-card-game', '2024-04-10', '2024-06-10', 30000, 'USD'),
  (15, 2, 'CalmPixel Light Panel', 'Wall-mounted ambient light that adapts to your focus and stress patterns.', 'Technology', 'kickstarter', 'going', 'https://www.kickstarter.com/projects/calmpixel-light-panel', '2025-01-20', '2025-03-20', 80000, 'USD'),
  (16, 3, 'Riverstone Micro Homes', 'Compact, energy-efficient tiny homes for seasonal workers.', 'Environment', 'indiegogo', 'upcoming', 'https://www.indiegogo.com/projects/riverstone-micro-homes', '2025-04-15', '2025-06-15', 175000, 'USD'),
  (17, 4, 'Lab-in-a-Box Chemistry Kit', 'Safe, curriculum-aligned chemistry experiments for schools without labs.', 'Education', 'gofundme', 'going', 'https://www.gofundme.com/f/lab-in-a-box-chemistry', '2024-12-10', '2025-02-20', 70000, 'USD'),
  (18, 5, 'Rooftop Roots Starter Kit', 'DIY rooftop garden kit with lightweight soil and irrigation.', 'Environment', 'kickstarter', 'completed', 'https://www.kickstarter.com/projects/rooftop-roots-kit', '2024-03-01', '2024-05-01', 45000, 'USD'),
  (19, 6, 'Pixel Archive Bus', 'A traveling exhibit that collects and showcases indie digital art.', 'Art', 'indiegogo', 'going', 'https://www.indiegogo.com/projects/pixel-archive-bus', '2025-01-10', '2025-03-10', 95000, 'USD'),
  (20, 1, 'TideWatch Community Sensors', 'Low-cost ocean and tide sensors for coastal resilience projects.', 'Environment', 'gofundme', 'upcoming', 'https://www.gofundme.com/f/tidewatch-community-sensors', '2025-03-01', '2025-04-30', 110000, 'USD');

-- Financials (one per project)
INSERT INTO financials (project_id, total_pledged, backer_count, average_pledge)
VALUES
  (1, 288000, 3200, 90),
  (2, 128000, 2100, 61),
  (3, 215000, 2600, 82.7),
  (4, 0, 0, NULL),
  (5, 92000, 1800, 51.1),
  (6, 0, 0, NULL),
  (7, 76000, 1400, 54.3),
  (8, 142000, 2300, 61.7),
  (9, 54000, 900, 60),
  (10, 64000, 1200, 53.3),
  (11, 98000, 1500, 65.3),
  (12, 62000, 800, 77.5),
  (13, 27000, 700, 38.6),
  (14, 34000, 600, 56.7),
  (15, 46000, 900, 51.1),
  (16, 0, 0, NULL),
  (17, 31000, 500, 62),
  (18, 47000, 750, 62.7),
  (19, 52000, 680, 76.5),
  (20, 0, 0, NULL);

-- Backers (sample, not linked to specific projects yet)
INSERT INTO backers (name, email, country) VALUES
  ('Alex Chen', 'alex.chen@example.com', 'USA'),
  ('Maria Gomez', 'maria.gomez@example.com', 'Spain'),
  ('Jonas Berg', 'jonas.berg@example.com', 'Sweden'),
  ('Fatima Noor', 'fatima.noor@example.com', 'Kenya'),
  ('Liam O''Connor', 'liam.oconnor@example.com', 'Ireland'),
  ('Sofia Rossi', 'sofia.rossi@example.com', 'Italy'),
  ('Hiro Tanaka', 'hiro.tanaka@example.com', 'Japan'),
  ('Emily Wright', 'emily.wright@example.com', 'UK'),
  ('Omar Haddad', 'omar.haddad@example.com', 'UAE'),
  ('Nina Petrova', 'nina.petrova@example.com', 'Bulgaria');

-- Backer contributions to projects (sample data)
INSERT INTO backer_projects (backer_id, project_id, amount_pledged) VALUES
  (1, 1, 150),
  (1, 2, 75),
  (2, 2, 120),
  (2, 3, 60),
  (3, 3, 90),
  (3, 5, 45),
  (4, 9, 80),
  (4, 17, 65),
  (5, 7, 55),
  (5, 18, 70),
  (6, 5, 95),
  (6, 19, 110),
  (7, 7, 40),
  (7, 8, 85),
  (8, 10, 50),
  (8, 13, 35),
  (9, 11, 130),
  (9, 12, 90),
  (10, 14, 60),
  (10, 15, 75);
