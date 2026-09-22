import { describe, expect, it, vi } from "vitest";
import { render } from "lit";
import { digitsOnly, otpInput } from "../src/otp-input.js";

describe("digitsOnly", () => {
  it("strips non-digits and caps length", () => {
    expect(digitsOnly("12a3-45", 6)).toBe("12345");
    expect(digitsOnly("9999999", 6)).toBe("999999");
    expect(digitsOnly("", 6)).toBe("");
  });
});

describe("otpInput", () => {
  it("renders 6 slots in a 3+sep+3 layout and accepts paste", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    let value = "";
    const onChange = vi.fn((v: string) => {
      value = v;
      render(otpInput({ id: "t", value, onChange }), host);
    });
    render(otpInput({ id: "t", value: "", onChange }), host);

    const root = host.querySelector("[data-otp]")!;
    expect(root.querySelectorAll(".otp-slot")).toHaveLength(6);
    expect(root.querySelector(".otp-sep")).toBeTruthy();

    const input = host.querySelector<HTMLInputElement>("#t")!;
    expect(input.getAttribute("maxlength")).toBe("6");
    expect(input.getAttribute("inputmode")).toBe("numeric");

    input.value = "123456";
    input.dispatchEvent(new Event("input"));
    expect(onChange).toHaveBeenCalledWith("123456");
    expect(value).toBe("123456");
    expect([...host.querySelectorAll(".otp-slot")].map((s) => s.textContent?.trim())).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
    ]);

    host.remove();
  });

  it("rejects non-digit keydowns", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    render(otpInput({ id: "t2", value: "", onChange: () => undefined }), host);
    const input = host.querySelector<HTMLInputElement>("#t2")!;
    const ev = new KeyboardEvent("keydown", { key: "a", bubbles: true, cancelable: true });
    input.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    host.remove();
  });
});
