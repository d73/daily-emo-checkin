import { afterEach, describe, expect, it, vi } from "vitest";
import { suggestExercise, talkReply, type AiContext } from "../src/worker/ai";
import type { Env } from "../src/worker/env";

const ctx: AiContext = {
  startScore: 4,
  latestScore: 4,
  entries: [
    { page: "feeling", actor: "user", text: "tired and angry", score: null },
    { page: "talk", actor: "user", text: "my coworker yelled at me", score: null },
  ],
};
const env = { AI_MODEL: "claude-sonnet-5-5", ANTHROPIC_API_KEY: "test-key" } as Env;

function fakeApi(json: object, stop_reason = "end_turn") {
  const calls: { url: string; body: any; headers: Headers }[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), body: JSON.parse(String(init.body)), headers: new Headers(init.headers) });
    return new Response(
      JSON.stringify({
        id: "msg_1",
        type: "message",
        role: "assistant",
        model: "claude-sonnet-5-5",
        content: [{ type: "text", text: JSON.stringify(json) }],
        stop_reason,
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 10 },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  });
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

describe("AI calls", () => {
  it("uses practice mode with no API key", async () => {
    const r = await talkReply({ AI_MODEL: "x" } as Env, ctx);
    expect(r.practice).toBe(true);
    expect(r.reply.length).toBeGreaterThan(10);
  });

  it("sends a structured-output request with the fallback setting and parses the reply", async () => {
    const calls = fakeApi({ crisis: false, reply: "That sounds hard." });
    const r = await talkReply(env, ctx);
    expect(r).toEqual({ crisis: false, reply: "That sounds hard.", practice: false });
    const { body, headers } = calls[0];
    expect(body.model).toBe("claude-sonnet-5-5");
    expect(body.fallbacks).toBe("default");
    expect(body.output_config.effort).toBe("low");
    expect(body.output_config.format.type).toBe("json_schema");
    expect(headers.get("anthropic-beta")).toContain("server-side-fallback-2026-07-01");
    expect(body.messages[0].content).toContain("my coworker yelled at me");
  });

  it("passes the AI's crisis flag through", async () => {
    fakeApi({ crisis: true, reply: "..." });
    expect((await talkReply(env, ctx)).crisis).toBe(true);
  });

  it("picks an exercise only from the fixed list", async () => {
    fakeApi({ crisis: false, skill: "stop", intro: "This can help when anger spikes." });
    const r = await suggestExercise(env, ctx);
    expect(r.skill.key).toBe("stop");
    expect(r.skill.steps.length).toBeGreaterThan(2);
  });

  it("falls back to a safe reply on a refusal or an error", async () => {
    fakeApi({}, "refusal");
    expect((await talkReply(env, ctx)).reply).toMatch(/Thank you for telling me/);
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 400 }));
    expect((await talkReply(env, ctx)).crisis).toBe(false);
  });
});
