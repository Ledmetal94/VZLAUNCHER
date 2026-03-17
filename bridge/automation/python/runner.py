"""
Persistent Python runner for VZLAUNCHER automation.

Reads JSON lines from stdin, executes each action, writes JSON result to stdout.
Exits on EOF or {"type": "exit"} command.
"""

import sys
import json
from actions import execute_action


def main():
    # Unbuffered stdout for real-time communication with Node
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            step = json.loads(line)
        except json.JSONDecodeError as e:
            result = {"success": False, "error": f"Invalid JSON: {e}"}
            print(json.dumps(result), flush=True)
            continue

        # Exit command
        if step.get("type") == "exit":
            break

        # Execute the action
        try:
            result = execute_action(step)
            print(json.dumps(result), flush=True)
        except Exception as e:
            result = {"success": False, "error": str(e), "step_type": step.get("type")}
            print(json.dumps(result), flush=True)


if __name__ == "__main__":
    main()
