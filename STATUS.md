# 📊 Development Status Board

## Sprint 0: Foundation ⏳ (Not Started)

- [x] **US-01**: Define Game Data Schema
    - File: `src/shared/types.ts`
    - Status: ⏳ Pending
    - Code: Copy from TODO.md Section 4

- [x] **US-02**: Setup Client-Server Communication
    - File: `src/shared/remotes.ts`
    - Status: ⏳ Pending
    - Code: Copy from TODO.md Section 5

- [ ] **US-03**: Install & Configure Roact
    - Command: `npm install @rbxts/roact` ✅ DONE
    - Status: ✅ Complete
    - Verify: `import Roact from "@rbxts/roact"` works

**Sprint 0 Complete When:**

- ✅ No TypeScript errors
- ✅ Roact can be imported
- ✅ RemoteEvents folder exists in ReplicatedStorage

---

## Sprint 1: Core Gameplay ⏳ (Not Started)

- [ ] **US-04**: Track Player Join/Leave Events
    - File: `src/server/data.ts`
    - Status: ⏳ Pending
    - Test: Join and check console for player logs

- [ ] **US-05**: Implement Passive Income Loop
    - File: `src/server/miner.ts`
    - Status: ⏳ Pending
    - Test: Miner loop prints coin updates every second

- [ ] **US-06**: Initialize Server Entry Point
    - File: `src/server/main.server.ts`
    - Status: ⏳ Pending
    - Test: Server logs "Server starting..." message

**Sprint 1 Complete When:**

- ✅ Console shows player join/leave
- ✅ Miner loop logs every 1 second
- ✅ No errors in Output tab

---

## Sprint 2: Reactive UI with Roact ⏳ (Not Started)

- [ ] **US-07**: Create Roact GameUI Component
    - File: `src/client/ui/components/GameUI.tsx`
    - Status: ⏳ Pending
    - Test: UI renders on screen

- [ ] **US-08**: Connect Client to Balance Updates
    - File: `src/client/main.client.ts`
    - Status: ⏳ Pending
    - Test: UI receives UpdateBalance events

- [ ] **US-09**: Send Balance Updates from Server
    - File: `src/server/miner.ts` (updated)
    - Status: ⏳ Pending
    - Test: Client receives new balance every second

**Sprint 2 Complete When:**

- ✅ Balance label visible on screen
- ✅ Balance updates in real-time
- ✅ Buy button clickable

---

## Sprint 3: Upgrade System ⏳ (Not Started)

- [ ] **US-10**: Create Upgrade Shop Component
    - File: `src/client/ui/components/UpgradeShop.tsx`
    - Status: ⏳ Pending
    - Test: Upgrade shop displays all upgrades

- [ ] **US-11**: Validate & Process Upgrade Purchases
    - File: `src/server/upgrade.ts`
    - Status: ⏳ Pending
    - Test: Server deducts coins and updates multiplier

- [ ] **US-12**: Connect Upgrade Purchases to Server
    - File: `src/server/main.server.ts` (updated)
    - Status: ⏳ Pending
    - Test: Clicking buy fires RemoteEvent

**Sprint 3 Complete When:**

- ✅ Upgrade shop displays all upgrades
- ✅ Can buy upgrades with coins
- ✅ Coins deducted correctly
- ✅ Can't buy if not enough coins

---

## 🎯 Current Priority

**Next Step:** Start Sprint 0 with US-01

**What to do:**

1. Open `TODO.md` and find section "4.1 US-01"
2. Copy the code for `src/shared/types.ts`
3. Create the file and paste the code
4. Save and watch `npm run watch` for errors
5. Verify no errors appear

---

## 📝 Notes

- **Roact Installed:** ✅ Yes (v3.0.1)
- **Rojo Configured:** ✅ Yes
- **Package.json Updated:** ✅ Yes
- **node_modules:** ✅ Up to date

---

## 🚀 Next Sprint After MVP

- [ ] DataStore persistence
- [ ] Offline earnings
- [ ] Animations & tweens
- [ ] Sound effects
- [ ] Leaderboard system
- [ ] Prestige/reset system
