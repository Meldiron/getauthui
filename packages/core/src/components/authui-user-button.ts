import { css, html, nothing } from "lit";
import type { Models } from "appwrite";
import { customElement, property, state } from "lit/decorators.js";
import { AuthUIElement } from "./element.js";
import { authStore } from "../store.js";
import { openModal } from "../modal-controller.js";
import { avatarInitial, icons } from "../icons.js";

/**
 * Avatar with a menu: shows a sign-in button while signed out, and the user's
 * avatar with "Manage account" and "Sign out" while signed in.
 */
@customElement("authui-user-button")
export class AuthUIUserButton extends AuthUIElement {
  /** When set, list the user's Appwrite teams and let them pick an active one. */
  @property({ type: Boolean, attribute: "show-teams" }) showTeams = false;

  static styles = [
    ...AuthUIElement.styles,
    css`
      :host {
        display: inline-block;
        position: relative;
      }
      .trigger {
        border: 1px solid transparent;
        background: transparent;
        padding: 2px;
        border-radius: 999px;
        cursor: pointer;
        display: inline-flex;
        transition: border-color 150ms;
      }
      .trigger:hover,
      .trigger[aria-expanded="true"] {
        border-color: var(--authui-border);
      }
      .trigger:focus-visible {
        outline: none;
        box-shadow: 0 0 0 3px color-mix(in oklab, var(--authui-ring) 50%, transparent);
      }
      .menu {
        position: absolute;
        top: calc(100% + 6px);
        inset-inline-end: 0;
        min-width: 220px;
        max-width: min(320px, 90vw);
        background: var(--authui-popover);
        color: var(--authui-popover-foreground);
        border: 1px solid var(--authui-border);
        border-radius: var(--authui-radius-md);
        box-shadow: var(--authui-shadow-lg);
        padding: 4px;
        z-index: var(--authui-z);
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .menu-header {
        min-width: 0;
        overflow: hidden;
        padding: 8px 10px 10px;
        display: flex;
        flex-direction: column;
        gap: 2px;
        border-bottom: 1px solid var(--authui-border);
        margin-bottom: 4px;
      }
      .menu .row-title,
      .menu .row-sub {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .menu-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        border-radius: var(--authui-radius-sm);
        border: 0;
        background: transparent;
        color: inherit;
        font: inherit;
        font-size: 14px;
        cursor: pointer;
        text-align: start;
        width: 100%;
      }
      .menu-item:hover,
      .menu-item:focus-visible {
        background: var(--authui-accent);
        outline: none;
      }
      .menu-item svg {
        width: 16px;
        height: 16px;
        color: var(--authui-muted-foreground);
      }
      .menu-section {
        border-top: 1px solid var(--authui-border);
        margin-top: 4px;
        padding-top: 4px;
      }
      .menu-section-label {
        padding: 6px 10px 2px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--authui-muted-foreground);
      }
      .menu-item.active {
        background: var(--authui-accent);
      }
      .menu-item .check {
        margin-inline-start: auto;
        color: var(--authui-brand);
      }
      .avatar {
        width: 32px;
        height: 32px;
        font-size: 13px;
      }
    `,
  ];

  /** Avatar image URL; falls back to initials. */
  @property({ type: String }) src = "";

  @state() private menuOpen = false;
  @state() private teams: Models.Team<Models.Preferences>[] = [];
  @state() private teamsLoading = false;
  @state() private activeTeamId: string | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener("click", this.onDocumentClick, true);
    document.addEventListener("keydown", this.onKeydown);
    this.addEventListener("keydown", this.onKeydown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener("click", this.onDocumentClick, true);
    document.removeEventListener("keydown", this.onKeydown);
    this.removeEventListener("keydown", this.onKeydown);
  }

  private onDocumentClick = (e: Event) => {
    if (!e.composedPath().includes(this)) this.menuOpen = false;
  };

  private onKeydown = (e: KeyboardEvent) => {
    if (!this.menuOpen) {
      if (
        (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") &&
        e.target === this.renderRoot?.querySelector(".trigger")
      ) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          this.menuOpen = true;
          requestAnimationFrame(() => this.focusMenuItem(0));
        }
      }
      return;
    }
    const items = [
      ...(this.renderRoot?.querySelectorAll('[role="menuitem"]') ?? []),
    ] as HTMLElement[];
    const current = items.findIndex((el) => el === this.shadowRoot?.activeElement);
    if (e.key === "Escape") {
      e.preventDefault();
      this.menuOpen = false;
      (this.renderRoot?.querySelector(".trigger") as HTMLElement | null)?.focus();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      this.focusMenuItem(current < 0 ? 0 : (current + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      this.focusMenuItem(
        current < 0 ? items.length - 1 : (current - 1 + items.length) % items.length
      );
    } else if (e.key === "Home") {
      e.preventDefault();
      this.focusMenuItem(0);
    } else if (e.key === "End") {
      e.preventDefault();
      this.focusMenuItem(items.length - 1);
    }
  };

  private focusMenuItem(index: number): void {
    const items = [
      ...(this.renderRoot?.querySelectorAll('[role="menuitem"]') ?? []),
    ] as HTMLElement[];
    items[index]?.focus();
  }

  protected updated(changed: Map<string, unknown>): void {
    if (changed.has("menuOpen") && this.menuOpen) {
      if (this.showTeams) void this.loadTeams();
      requestAnimationFrame(() => this.focusMenuItem(0));
    }
  }

  private toggleMenu = (): void => {
    this.menuOpen = !this.menuOpen;
    if (this.menuOpen && this.showTeams) void this.loadTeams();
  };

  private async loadTeams(): Promise<void> {
    this.teamsLoading = true;
    this.activeTeamId = authStore.getActiveTeamId();
    try {
      this.teams = await authStore.listTeams();
      // Drop a stale active id that is no longer a membership.
      if (this.activeTeamId && !this.teams.some((team) => team.$id === this.activeTeamId)) {
        this.activeTeamId = null;
        authStore.setActiveTeam(null);
      }
    } catch {
      this.teams = [];
    } finally {
      this.teamsLoading = false;
    }
  }

  private selectTeam = (team: Models.Team<Models.Preferences>): void => {
    authStore.setActiveTeam({ $id: team.$id, name: team.name });
    this.activeTeamId = team.$id;
    this.dispatchEvent(
      new CustomEvent("authui-active-team", {
        detail: { teamId: team.$id, team },
        bubbles: true,
        composed: true,
      })
    );
  };

  protected render() {
    const { status, user, configured } = this.auth;
    // Only spin while a real refresh is in flight. Incomplete config used to leave
    // status stuck on "loading" with a forever spinner.
    if (status === "loading" && configured)
      return html`<span class="avatar"><span class="spinner"></span></span>`;
    if (status !== "signed-in" || !user) {
      return html`<button class="btn btn-primary btn-sm" @click=${() => openModal("sign-in")}>
        <slot>${this.t("signIn")}</slot>
      </button>`;
    }
    const label = user.name || user.email || user.phone || this.t("guestAccount");
    return html`
      <button
        class="trigger"
        aria-haspopup="menu"
        aria-expanded=${this.menuOpen ? "true" : "false"}
        @click=${this.toggleMenu}
        aria-label=${label}
      >
        <span class="avatar"
          >${this.src ? html`<img src=${this.src} alt="" />` : avatarInitial(label)}</span
        >
      </button>
      ${
        this.menuOpen
          ? html`<div class="menu" role="menu">
              <div class="menu-header">
                <span class="row-title" title=${label}>${label}</span>
                ${
                  user.email && user.name
                    ? html`<span class="row-sub" title=${user.email}>${user.email}</span>`
                    : nothing
                }
              </div>
              ${
                this.showTeams
                  ? html`<div class="menu-section">
                      <div class="menu-section-label">${this.t("teamsLabel")}</div>
                      ${
                        this.teamsLoading
                          ? html`<div class="menu-item" aria-busy="true">
                              <span class="spinner"></span>
                            </div>`
                          : this.teams.length === 0
                            ? html`<div class="menu-item" role="note">${this.t("noTeams")}</div>`
                            : this.teams.map(
                                (team) =>
                                  html`<button
                                    class="menu-item ${team.$id === this.activeTeamId ? "active" : ""}"
                                    role="menuitemradio"
                                    aria-checked=${team.$id === this.activeTeamId ? "true" : "false"}
                                    @click=${() => this.selectTeam(team)}
                                  >
                                    ${icons.users}
                                    <span title=${team.name}>${team.name}</span>
                                    ${
                                      team.$id === this.activeTeamId
                                        ? html`<span class="check">${icons.check}</span>`
                                        : nothing
                                    }
                                  </button>`
                              )
                      }
                    </div>`
                  : nothing
              }
              <button
                class="menu-item"
                role="menuitem"
                @click=${() => {
                  this.menuOpen = false;
                  openModal("account");
                }}
              >
                ${icons.settings} ${this.t("manageAccount")}
              </button>
              <button
                class="menu-item"
                role="menuitem"
                @click=${() => {
                  this.menuOpen = false;
                  void authStore.signOut();
                }}
              >
                ${icons.logOut} ${this.t("signOut")}
              </button>
            </div>`
          : nothing
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "authui-user-button": AuthUIUserButton;
  }
}
