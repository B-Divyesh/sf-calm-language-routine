# Quiet Loop demo

- URL: `https://calm-language-routine.sociobot.in/demo`
- Entry: select **Try it with sample data** on the empty first screen.
- Sample: five Spanish travel and conversation cards, a four-card review,
  daily limit settings, and one weekly reflection.
- Persistent label: **Demo — sample data, nothing is saved**.
- Reset: select **Reset demo** to restore the original five cards.
- Exit: select **Start for real**. This deletes the demo database before
  opening the real empty workspace.

Demo data uses IndexedDB database `demo:quiet-loop` and the local storage key
prefix `demo:`. Real data uses IndexedDB database `quiet-loop`. The application
does not open the real database while `/demo` is active.
