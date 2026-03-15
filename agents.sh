#!/bin/bash

TASK_PROMPT="You are a task agent. Follow these steps exactly:
1. Use Notion to find the first task with status 'Not Started'
2. Immediately move it to 'In Progress' before doing anything else
3. Create a new Git branch named: task/[notion-task-id]
4. Read the full task page in Notion for instructions
5. Complete the task fully on that branch
6. Commit and push the branch when done
7. Move the Notion task to 'Done'
8. Repeat from step 1 until no 'Not Started' tasks remain"

MERGE_PROMPT="You are a merge agent. Follow these steps exactly:
1. Run: git checkout main && git pull
2. Get all task branches: git branch -r | grep task/
3. Merge each task branch into main one by one
4. If there are merge conflicts: resolve them by keeping the more complete or newer implementation
5. After resolving each conflict: git add . && git commit
6. When all branches are merged: git push origin main
7. Delete all task/ branches locally and remotely"

mkdir -p logs

for i in 1 2 3; do
  echo "Starting Agent $i..."
  claude --dangerously-skip-permissions -p "$TASK_PROMPT" > logs/agent-$i.log 2>&1 &
done

echo "Waiting for all agents to finish..."
wait

echo "All agents done. Starting merge agent..."
claude --dangerously-skip-permissions -p "$MERGE_PROMPT" > logs/merge-agent.log 2>&1

echo "Done. Check logs/merge-agent.log for details."