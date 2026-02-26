---
name: omc-help
description: Guide on using oh-my-claudecode plugin
---

# How OMC Works

**You don't need to learn any commands!** OMC enhances Claude Code with intelligent behaviors that activate automatically.

## What Happens Automatically

| When You... | I Automatically... |
|-------------|-------------------|
| Give me a complex task | Parallelize and delegate to 21 specialist agents |
| Ask me to plan something | Start a planning interview |
| Need something done completely | Persist until verified complete |
| Work on UI/frontend | Activate design sensibility |
| Say "stop" or "cancel" | Intelligently stop current operation |

## Magic Keywords (Optional Shortcuts)

You can include these words naturally in your request for explicit control:

| Keyword | Effect | Example |
|---------|--------|---------|
| **autopilot** | Full autonomous execution | "autopilot: build a REST API" |
| **ralph** | Persistent execution with verify/fix loops | "ralph: fix all the bugs" |
| **ulw** / **ultrawork** | Maximum parallelism | "ulw refactor the API" |
| **ultrapilot** | Parallel autonomous execution | "ultrapilot: build the frontend" |
| **plan** | Strategic planning interview | "plan the new endpoints" |
| **ralplan** | Iterative planning with consensus | "ralplan this feature" |
| **pipeline** | Sequential staged processing | "pipeline: review then fix then test" |
| **analyze** | Root-cause analysis and debugging | "analyze why tests fail" |
| **tdd** | Test-driven development workflow | "tdd: add user validation" |
| **sciomc** | Parallel scientist agents | "sciomc: analyze performance data" |

**ralph includes ultrawork:** When you activate ralph mode, it automatically includes ultrawork's parallel execution. No need to combine keywords.

## 27 Skills Available

Use any skill with `/oh-my-claudecode:<skill-name>`.

| Category | Skills |
|----------|--------|
| **Orchestration** | `autopilot`, `ralph`, `ultrawork`, `ultrapilot`, `pipeline`, `ultraqa` |
| **Planning** | `plan`, `ralplan`, `review` |
| **Analysis** | `analyze`, `sciomc`, `external-context`, `tdd`, `build-fix`, `code-review`, `security-review` |
| **Utilities** | `cancel`, `note`, `learner`, `omc-doctor`, `omc-help`, `mcp-setup`, `skill`, `trace`, `ralph-init`, `learn-about-omc`, `writer-memory` |

## Stopping Things

Just say:
- "stop"
- "cancel"
- "abort"

I'll figure out what to stop based on context.

---

## Usage Analysis

Analyze your oh-my-claudecode usage and get tailored recommendations to improve your workflow.

> Note: This replaces the former `/oh-my-claudecode:learn-about-omc` skill.

### What It Does

1. Reads token tracking from `~/.omc/state/token-tracking.jsonl`
2. Reads session history from `.omc/state/session-history.json`
3. Analyzes agent usage patterns
4. Identifies underutilized features
5. Recommends configuration changes

### Step 1: Gather Data

```bash
# Check for token tracking data
TOKEN_FILE="$HOME/.omc/state/token-tracking.jsonl"
SESSION_FILE=".omc/state/session-history.json"
CONFIG_FILE="$HOME/.claude/.omc-config.json"

echo "Analyzing OMC Usage..."
echo ""

# Check what data is available
HAS_TOKENS=false
HAS_SESSIONS=false
HAS_CONFIG=false

if [[ -f "$TOKEN_FILE" ]]; then
  HAS_TOKENS=true
  TOKEN_COUNT=$(wc -l < "$TOKEN_FILE")
  echo "Token records found: $TOKEN_COUNT"
fi

if [[ -f "$SESSION_FILE" ]]; then
  HAS_SESSIONS=true
  SESSION_COUNT=$(cat "$SESSION_FILE" | jq '.sessions | length' 2>/dev/null || echo "0")
  echo "Sessions found: $SESSION_COUNT"
fi

if [[ -f "$CONFIG_FILE" ]]; then
  HAS_CONFIG=true
  DEFAULT_MODE=$(cat "$CONFIG_FILE" | jq -r '.defaultExecutionMode // "not set"')
  echo "Default execution mode: $DEFAULT_MODE"
fi
```

### Step 2: Analyze Agent Usage (if token data exists)

```bash
if [[ "$HAS_TOKENS" == "true" ]]; then
  echo ""
  echo "TOP AGENTS BY USAGE:"
  cat "$TOKEN_FILE" | jq -r '.agentName // "main"' | sort | uniq -c | sort -rn | head -10

  echo ""
  echo "MODEL DISTRIBUTION:"
  cat "$TOKEN_FILE" | jq -r '.modelName' | sort | uniq -c | sort -rn
fi
```

### Step 3: Generate Recommendations

Based on patterns found, output recommendations:

**If high Opus usage (>40%):**
- "Consider using haiku-tier agents for routine tasks to save tokens"

**If no pipeline usage:**
- "Try /pipeline for code review workflows"

**If no security-reviewer usage:**
- "Use security-reviewer after auth/API changes"

**If defaultExecutionMode not set:**
- "Set defaultExecutionMode in config for consistent behavior"

### Step 4: Output Report

Format a summary with:
- Token summary (total, by model)
- Top agents used
- Underutilized features
- Personalized recommendations

### Example Output

```
Your OMC Usage Analysis

TOKEN SUMMARY:
- Total records: 1,234
- By Model: opus 45%, sonnet 40%, haiku 15%

TOP AGENTS:
1. executor (234 uses)
2. architect (89 uses)
3. explore (67 uses)

UNDERUTILIZED FEATURES:
- haiku-tier agents: 0 uses (could save ~30% on routine tasks)
- pipeline: 0 uses (great for review workflows)

RECOMMENDATIONS:
1. Use haiku-tier agents for simple lookups to save tokens
2. Try /pipeline for sequential review workflows
3. Use explore agent before architect to save context
```

### Graceful Degradation

If no data found:

```
Limited Usage Data Available

No token tracking found. To enable tracking:
1. Ensure ~/.omc/state/ directory exists
2. Run any OMC command to start tracking

Tip: Run any skill to get started.
```

## Need More Help?

- **README**: https://github.com/yousiki/oh-my-claudecode
- **Issues**: https://github.com/yousiki/oh-my-claudecode/issues

---

*Version: 5.0.0*
