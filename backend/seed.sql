INSERT INTO boards (name) VALUES ('Main Board');

INSERT INTO columns (board_id, title, order_index)
VALUES
(1, 'To Do', 1),
(1, 'In Progress', 2),
(1, 'Done', 3);

INSERT INTO tasks (column_id, title, description, priority)
VALUES 
(1, 'Set up backend', 'Use FastAPI and SQLite', 'High'),
(1, 'Design UI', 'Keep it simple', 'Median');