# 🚀 Sprint Execution Guide

## How to Use This Doc

Each sprint has **user stories** with:

- 📖 **Story format** ("As a X, I want Y so that Z")
- ✅ **Acceptance criteria** (what makes it done)
- 💻 **Code template** (copy-paste ready)

**Work through sprints in order.** Don't skip ahead.

---

## 🎯 Before You Start

```bash
# Terminal 1: Watch TypeScript compilation
npm run watch

# Terminal 2: Run Rojo
rojo serve default.project.json

# In Roblox Studio: Click Rojo plugin "Connect"
```

---

## 📊 Sprint 0: Foundation (1-2 hours)

### What You'll Build

- 📝 Data type definitions
- 🔌 RemoteEvents for networking
- ⚛️ Roact UI framework

### Tasks

1. **US-01**: Create `src/shared/types.ts` with PlayerData & Upgrade interfaces
2. **US-02**: Create `src/shared/remotes.ts` with getRemotes() function
3. **US-03**: Verify Roact is installed (`@rbxts/roact` in node_modules)

### ✅ Success Criteria

- No TypeScript errors
- Roact can be imported without errors
- RemoteEvents folder appears in ReplicatedStorage

---

## 🎮 Sprint 1: Core Gameplay (2-3 hours)

### What You'll Build

- 👥 Player tracking system
- 💰 Passive income loop (+1 coin/sec)
- ⚙️ Server initialization

### Tasks

1. **US-04**: Create `src/server/data.ts` (player join/leave)
2. **US-05**: Create `src/server/miner.ts` (mining loop)
3. **US-06**: Update `src/server/main.server.ts` to start systems

### ✅ Success Criteria

- Output shows "Server starting..." message
- Miner loop logs coin updates every second
- Console shows player join/leave events

---

## 🎨 Sprint 2: Reactive UI (2-3 hours)

### What You'll Build

- ⚛️ Roact GameUI component
- 📊 Real-time balance display
- 🔗 Client-server sync

### Tasks

1. **US-07**: Create `src/client/ui/components/GameUI.tsx` (Roact component)
2. **US-08**: Update `src/client/main.client.ts` (mount UI & listen for updates)
3. **US-09**: Update `src/server/miner.ts` (send balance to clients)

### ✅ Success Criteria

- UI appears on screen when you join
- Balance label shows current coins
- Balance updates every second
- No errors in Studio output

---

## 🛍️ Sprint 3: Upgrade System (2-3 hours)

### What You'll Build

- 🛒 Upgrade shop UI component
- ✅ Purchase validation (server-side)
- 📤 Upgrade buy event handler

### Tasks

1. **US-10**: Create `src/client/ui/components/UpgradeShop.tsx` (shop UI)
2. **US-11**: Create `src/server/upgrade.ts` (buy validation logic)
3. **US-12**: Wire up buy button to server event

### ✅ Success Criteria

- Upgrade shop displays all upgrades
- Buy buttons visible and clickable
- Coins deducted when purchase succeeds
- Can't buy if not enough coins
- UI updates after purchase

---

## 🎯 Structure Your Day

**Option A: Full Marathon** (6-8 hours)

- Do all 4 sprints in one session
- Take breaks between sprints

**Option B: Daily Sprints**

- Day 1: Sprint 0 + Sprint 1
- Day 2: Sprint 2 + Sprint 3
- Day 3: Polish & add features

**Option C: Micro Sprints** (recommended for learning)

- Do 1 sprint per session
- Pause to understand code
- Experiment before moving on

---

## 🐛 Debugging Quick Fixes

| Problem              | Solution                                                                         |
| -------------------- | -------------------------------------------------------------------------------- |
| "Cannot find module" | Check import path (use `"shared/types"` not `"../shared/types"`)                 |
| UI doesn't appear    | Make sure `playerGui.WaitForChild("PlayerGui")` completes                        |
| Balance not updating | Add `print()` before `remotes.UpdateBalance.FireClient()`                        |
| Roact error          | Check instance syntax matches Roblox classes (e.g., `screengui` not `ScreenGui`) |
| No console output    | Check you're looking at **Output** tab, not Command Bar                          |

---

## 📁 File Checklist

Before moving to next sprint, verify files exist:

**Sprint 0:**

- [ ] `src/shared/types.ts`
- [ ] `src/shared/remotes.ts`

**Sprint 1:**

- [ ] `src/server/data.ts`
- [ ] `src/server/miner.ts`
- [ ] `src/server/main.server.ts` (updated)

**Sprint 2:**

- [ ] `src/client/ui/components/GameUI.tsx`
- [ ] `src/client/main.client.ts` (updated)

**Sprint 3:**

- [ ] `src/client/ui/components/UpgradeShop.tsx`
- [ ] `src/server/upgrade.ts`
- [ ] `src/server/main.server.ts` (updated)

---

## 💡 Tips for Success

1. **Copy-paste code from TODO.md** - It's ready to use
2. **Test after each US** - Don't wait until sprint end
3. **Use print() statements** - Debug with console logs
4. **Restart Rojo if stuck** - Fixes 50% of issues
5. **Read error messages** - roblox-ts gives great hints

---

## 🎓 Learning Resources

- **Roact Docs:** github.com/roblox-ts/roact
- **Roblox-TS Handbook:** roblox-ts.com
- **Luau Docs:** luau-lang.org

Enjoy building! 🚀
