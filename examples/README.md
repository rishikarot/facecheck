# React-friendly integration

The file `react-wrapper.jsx` illustrates how to wrap the framework-independent `FaceCheckWidget` using `useEffect`/`useRef`.

In a production React app, copy SDK `src/` and `styles/` into the project, host all generated `assets/` under a stable public URL, pass that path through `baseUrl`, and make changes through widget methods rather than destroying an active camera unnecessarily.

For a high-risk onboarding/authentication workflow, do not trust client-side liveness verdicts by themselves; add a vetted PAD provider and an authenticated server-side session/audit path.
