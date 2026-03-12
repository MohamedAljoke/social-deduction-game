# Status: DONE (2026-03-11) — all 4 scaling risks addressed.
See commit history for implementation details.

---

It will scale to 10 more abilities, but only if you tighten a few boundaries now.

The good part is the core shape is sound:

- ability identity lives in EffectType
- execution is delegated to per-ability handlers
- ActionResolver gives you stage-based ordering
- Match remains the authority for cross-phase rules

That is a reasonable foundation for a dozen or two abilities.

The main scaling risks are these:

- Too many duplicated ability registries.
  You already have backend enum/stage/priority plus frontend labels/metadata/template lists/test unions. Adding abilities will keep causing drift. This is the first
  place the design will hurt.
- ResolutionContext is still stringly typed.
  modifiers, EffectResult.type, and parts of StateChange are loosely modeled. That gets fragile once abilities start composing.
- Cross-phase state will accumulate inside Match.
  voteShieldedPlayerIds is fine by itself, but if you add 5-6 persistent effects, Match can turn into a bag of special-case sets/maps unless you introduce a clearer
  status/effect model.
- Stages are coarse.
  TARGET_MUTATION / DEFENSIVE / CANCELLATION / OFFENSIVE / READ is enough for now, but more reactive abilities can create awkward ordering disputes.

My recommendation:

- Keep the handler-based model.
- Centralize ability definitions into one shared capability registry per layer.
- Make resolution types stricter.
- Introduce a dedicated persisted status/effect model before you add many more cross-phase abilities.

Concretely, if you keep expanding this system, I’d do these next:

1. Create a backend ABILITY_DEFINITIONS registry that owns stage, priority, targeting rules, and maybe display metadata.
2. Derive frontend metadata from a shared contract or generated schema instead of hand-maintaining parallel maps.
3. Replace freeform modifier/result strings with unions or typed objects.
4. If more persistent effects are coming, add something like matchEffects or playerStatuses rather than one field per ability.

So: yes, it scales moderately well from here, but it will start degrading if you keep adding abilities without consolidating configuration and persistent-effect
