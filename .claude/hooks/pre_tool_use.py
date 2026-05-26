#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.8"
# ///

import json
import sys
import re
import subprocess
from pathlib import Path

def is_dangerous_rm_command(command):
    """
    Safe-guarded detection of dangerous rm commands (changed 2026-05-25).

    Recursive rm (rm -rf, rm -r, rm --recursive) on ordinary relative/project
    paths like `.next` or `node_modules` is ALLOWED. Only catastrophic targets
    are still blocked: filesystem root, system root dirs, the home directory,
    $HOME, parent-directory traversal, a bare wildcard, and the current dir.
    """
    # Normalize command by removing extra spaces and converting to lowercase
    normalized = ' '.join(command.lower().split())

    # Only recursive rm can be destructive enough to guard.
    has_recursive = bool(re.search(r'\brm\s+(-[a-z]*r|--recursive)', normalized))
    if not has_recursive:
        return False

    # Catastrophic targets — never allowed, even with safe-guarded rm.
    dangerous_targets = [
        r'\s/\s*($|\*)',                                                       # rm -rf /  or  rm -rf /*
        r'\s/(bin|boot|dev|etc|home|lib|lib64|opt|proc|root|sbin|srv|sys|usr|var)\b',  # system root dirs
        r'\s~(/|\s|$)',                                                        # home dir  ~  or  ~/...
        r'\$home\b',                                                           # $HOME
        r'(^|\s)\.\.(/|\s|$)',                                                 # parent traversal  ..  or  ../
        r'\s\*(\s|$)',                                                         # bare wildcard target  rm -rf *
        r'\s\.(\s|$)',                                                         # current dir target  rm -rf .
    ]
    for pattern in dangerous_targets:
        if re.search(pattern, normalized):
            return True

    return False

def is_env_file_access(tool_name, tool_input):
    """
    Check if any tool is trying to access .env files containing sensitive data.
    """
    if tool_name in ['Read', 'Edit', 'MultiEdit', 'Write', 'Bash']:
        # Check file paths for file-based tools
        if tool_name in ['Read', 'Edit', 'MultiEdit', 'Write']:
            file_path = tool_input.get('file_path', '')
            if '.env' in file_path and not file_path.endswith('.env.sample'):
                return True
        
        # Check bash commands for .env file access
        elif tool_name == 'Bash':
            command = tool_input.get('command', '')
            # Pattern to detect .env file access (but allow .env.sample)
            env_patterns = [
                r'\b\.env\b(?!\.sample)',  # .env but not .env.sample
                r'cat\s+.*\.env\b(?!\.sample)',  # cat .env
                r'echo\s+.*>\s*\.env\b(?!\.sample)',  # echo > .env
                r'touch\s+.*\.env\b(?!\.sample)',  # touch .env
                r'cp\s+.*\.env\b(?!\.sample)',  # cp .env
                r'mv\s+.*\.env\b(?!\.sample)',  # mv .env
            ]
            
            for pattern in env_patterns:
                if re.search(pattern, command):
                    return True
    
    return False

def run_humi_design_check(input_data):
    """Run the repo-local Humi design-system validator for write/edit payloads."""
    validator = Path(__file__).parent / 'validators' / 'humi_design_check.py'
    if not validator.exists():
        return 0

    result = subprocess.run(
        [sys.executable, str(validator)],
        input=json.dumps(input_data),
        text=True,
        capture_output=True,
        timeout=10,
    )
    if result.stdout:
        print(result.stdout, end='')
    if result.stderr:
        print(result.stderr, end='', file=sys.stderr)
    return result.returncode


def main():
    try:
        # Read JSON input from stdin
        input_data = json.load(sys.stdin)
        
        tool_name = input_data.get('tool_name', '')
        tool_input = input_data.get('tool_input', {})
        
        # NOTE: .env file access check disabled (2026-03-17) to allow Claude to read/edit .env files
        # if is_env_file_access(tool_name, tool_input):
        #     print("BLOCKED: Access to .env files containing sensitive data is prohibited", file=sys.stderr)
        #     print("Use .env.sample for template files instead", file=sys.stderr)
        #     sys.exit(2)  # Exit code 2 blocks tool call and shows error to Claude
        
        # Check for dangerous rm -rf commands
        if tool_name == 'Bash':
            command = tool_input.get('command', '')
            
            # Block rm -rf commands with comprehensive pattern matching
            if is_dangerous_rm_command(command):
                print("BLOCKED: Dangerous rm command detected and prevented", file=sys.stderr)
                sys.exit(2)  # Exit code 2 blocks tool call and shows error to Claude

        # Enforce Humi design-system contract for frontend Write/Edit/MultiEdit payloads.
        humi_exit = run_humi_design_check(input_data)
        if humi_exit != 0:
            sys.exit(humi_exit)
        
        # Ensure log directory exists
        log_dir = Path.cwd() / 'logs'
        log_dir.mkdir(parents=True, exist_ok=True)
        log_path = log_dir / 'pre_tool_use.json'
        
        # Read existing log data or initialize empty list
        if log_path.exists():
            with open(log_path, 'r') as f:
                try:
                    log_data = json.load(f)
                except (json.JSONDecodeError, ValueError):
                    log_data = []
        else:
            log_data = []
        
        # Append new data
        log_data.append(input_data)
        
        # Write back to file with formatting
        with open(log_path, 'w') as f:
            json.dump(log_data, f, indent=2)
        
        sys.exit(0)
        
    except json.JSONDecodeError:
        # Gracefully handle JSON decode errors
        sys.exit(0)
    except Exception:
        # Handle any other errors gracefully
        sys.exit(0)

if __name__ == '__main__':
    main()