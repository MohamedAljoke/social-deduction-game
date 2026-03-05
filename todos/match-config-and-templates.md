# Match Config + Dynamic Templates Plan

## Goal

Improve game creation and start flow with:

- Configurable open voting (`showVotingTransparency`) at match creation
- Dynamic template builder where host can add templates up to player count
- Template names preserved into started game
- Default fallback template behavior (`Citizen` / hero) when missing

## Tasks

- [x] Backend: add match config model with `showVotingTransparency` defaulting to `true`
- [x] Backend: accept `config` on `POST /match`
- [x] Backend: include `config` in match response payloads
- [x] Backend: accept template `name` in start payload and persist it
- [x] Backend: fallback template name to `Citizen` when template name is blank/missing
- [x] Frontend: add create-game control for open voting toggle
- [x] Frontend: send create payload `{ name, config }`
- [x] Frontend: gate voting transparency UI by `match.config.showVotingTransparency`
- [x] Frontend: extend template builder with add/remove controls (max = player count)
- [x] Frontend: keep two suggested templates as the initial builder state
- [x] E2E: add coverage for dynamic template add flow
- [x] E2E: add coverage for open voting disabled flow

## Notes

- We intentionally keep quick-start (`Start Game` from lobby) behavior unchanged; it uses backend defaults.
- We intentionally keep backend template-padding behavior for fewer templates than players.
