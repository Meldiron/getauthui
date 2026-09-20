import { css } from "lit";

export const signInStyles = css`
  :host {
    display: block;
    width: 100%;
    max-width: 420px;
    min-width: 0;
  }
  .panel {
    min-width: 0;
    overflow: hidden;
    background: var(--authui-card);
    color: var(--authui-card-foreground);
    border: 1px solid var(--authui-border);
    border-radius: var(--authui-radius-xl);
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    box-shadow: var(--authui-shadow-lg);
  }
  .panel.embedded {
    border: 0;
    box-shadow: none;
    padding: 0;
    background: transparent;
  }
  .header {
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .header:empty {
    display: none;
  }
  .header .preview {
    align-self: center;
    margin-bottom: 4px;
  }
  .alert .dismiss {
    position: absolute;
    top: 4px;
    inset-inline-end: 4px;
    width: 28px;
    height: 28px;
  }
  .alert .dismiss svg {
    width: 14px;
    height: 14px;
    margin: 0;
  }
`;
