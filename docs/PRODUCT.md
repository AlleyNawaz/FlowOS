# FlowOS product brief

## The first wedge

FlowOS is the private command center for personal work: one place to find local context, understand it, and take a reviewable next action.

The initial target user is a knowledge worker on macOS or Windows who repeatedly loses time reconstructing context across files. The first recurring job is simple: “I remember what this was about, but not what it was called or where I put it.” Search earns trust first. Understanding and action build on that trust.

## Competitive finding

The category changed materially by September 2026. Raycast already combines launcher search, file content search, AI tools, and extensions. Notion AI searches connected company tools with source citations. ChatGPT desktop now combines chat, long-running work, file access, and app workflows. FlowOS cannot win by merely placing those feature names in a sidebar.

The product differentiator is a consistent local-first trust model:

1. The user always sees which sources are in scope.
2. Retrieval happens locally where possible.
3. Generated answers cite the local artifacts used.
4. Every state-changing action has a preview and a clear confirmation boundary.
5. Memory is inspectable, editable, and deletable.

This alpha implements the first two points for filename and path retrieval. It deliberately labels later capabilities instead of pretending they work.

## Primary loop

1. Invoke FlowOS with `Command/Ctrl + K`.
2. Ask in natural language.
3. See ranked local results or an assistant plan.
4. Open the source or review the proposed next action.
5. Return through recents with no manual organization.

## MVP success measures

- Activation: at least 70% of new users complete a useful search in the first session.
- Retrieval success: at least 75% of searches end with an opened result within 30 seconds.
- Retention: at least 35% weekly active users return on three or more days per week.
- Trust: fewer than 2% of sessions disable all indexing after onboarding.
- Speed: p95 keystroke-to-results below 150 ms once the local index ships in Milestone 2.

## Business path

The individual product should stay useful without a subscription. A paid Pro tier can add encrypted cross-device memory, larger AI usage, document understanding, advanced workflows, and integrations. Teams can add shared connectors, permission-aware search, audit logs, administrative policy, and managed deployment. Pricing decisions follow retention evidence rather than preceding it.

## Research sources

- [Raycast File Search](https://manual.raycast.com/file-search) documents natural-language file finding, content search, and local index controls.
- [Raycast AI Extensions](https://manual.raycast.com/ai/ai-extensions) shows AI tools acting across local and connected services with configurable approvals.
- [Notion Enterprise Search](https://www.notion.com/product/enterprise-search) documents connected-source search, citations, permissions, and research workflows.
- [ChatGPT desktop](https://openai.com/index/chatgpt-for-your-most-ambitious-work/) now positions ChatGPT Work around sustained work across apps and files.
- [Tauri security guidance](https://v2.tauri.app/security/) supports a capability-oriented native shell with a narrow command surface.

