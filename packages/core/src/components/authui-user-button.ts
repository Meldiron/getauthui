import { css, html, nothing } from "lit";
import type { Models } from "appwrite";
import { customElement, property, state } from "lit/decorators.js";
import { AuthUIElement } from "./element.js";
import { authStore } from "../store.js";
import { openModal } from "../modal-controller.js";
import { avatarPhotoUrl } from "../avatar-photo.js";
import { avatarInitial, icons } from "../icons.js";
import type { AuthUIMenuItem } from "../types.js";

/**
 * Avatar with a menu: shows a sign-in button while signed out, and the user's
 * avatar with "Manage account" and "Sign out" while signed in.
 */
@customElement("authui-user-button")
export class AuthUIUserButton extends AuthUIElement {
  /** When set, list the user's Appwrite teams and let them pick an active one. */
  @property({ type: Boolean, attribute: "show-teams" }) showTeams = false;

  /**
   * Extra menu rows between teams and the built-in Manage account / Sign out items.
   * Labels are integrator-supplied (not passed through t()). Prefer this over the
   * `menu-items` slot when you want keyboard navigation to include the rows.
   */
  @property({ attribute: false }) menuItems: AuthUIMenuItem[] = [];

  static styles = [
    ...AuthUIElement.styles,
    css`
      :host {
        display: inline-block;
        position: relative;
      }
      :host([data-config-error]) {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
        max-width: min(100%, 360px);
      }
      .config-error {
        box-sizing: border-box;
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
        bottom: auto;
        inset-inline-end: 0;
        min-width: 220px;
        max-width: min(320px, 90vw);
        max-height: min(360px, calc(100dvh - 16px));
        overflow-y: auto;
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
      .menu.above {
        top: auto;
        bottom: calc(100% + 6px);
      }
      .menu.start {
        inset-inline-end: auto;
        inset-inline-start: 0;
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
      a.menu-item {
        text-decoration: none;
        box-sizing: border-box;
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
      .menu-item[aria-disabled="true"] {
        cursor: default;
        color: var(--authui-muted-foreground);
      }
      .menu-item[aria-disabled="true"]:hover {
        background: transparent;
      }
      .menu-item[aria-disabled="true"]:focus-visible {
        background: var(--authui-accent);
        outline: none;
      }
      .avatar {
        width: 32px;
        height: 32px;
        font-size: 13px;
      }
    `,
  ];

  /** Avatar image URL override. When empty, uses Appwrite getPhoto; on error, initials. */
  @property({ type: String }) src = "";

  @state() private menuOpen = false;
  @state() private menuAbove = false;
  /** Align menu to inline-start when end-aligned would overflow the viewport. */
  @state() private menuStart = false;
  @state() private teams: Models.Team<Models.Preferences>[] = [];
  @state() private teamsLoading = false;
  @state() private activeTeamId: string | null = null;
  /** Photo URL that failed to load; skip that URL and show initials. */
  @state() private photoFailedUrl: string | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener("click", this.onDocumentClick, true);
    document.addEventListener("keydown", this.onKeydown);
    this.addEventListener("keydown", this.onKeydown);
    window.addEventListener("resize", this.onReposition);
    window.addEventListener("scroll", this.onReposition, true);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener("click", this.onDocumentClick, true);
    document.removeEventListener("keydown", this.onKeydown);
    this.removeEventListener("keydown", this.onKeydown);
    window.removeEventListener("resize", this.onReposition);
    window.removeEventListener("scroll", this.onReposition, true);
  }

  private onReposition = (): void => {
    if (this.menuOpen) this.placeMenu();
  };

  /**
   * Place the menu so it stays in the viewport: flip above/below and
   * start/end-align based on available space around the trigger.
   */
  private placeMenu(): void {
    const trigger = this.renderRoot?.querySelector(".trigger") as HTMLElement | null;
    const menu = this.renderRoot?.querySelector(".menu") as HTMLElement | null;
    if (!trigger || !menu) return;
    const tr = trigger.getBoundingClientRect();
    const gap = 6;
    const margin = 8;
    // Measure natural size without the previous max-height clamp.
    menu.style.maxHeight = "";
    const needed = menu.offsetHeight + gap;
    const spaceBelow = window.innerHeight - tr.bottom;
    const spaceAbove = tr.top;
    const above = spaceBelow < needed && spaceAbove > spaceBelow;
    if (above !== this.menuAbove) this.menuAbove = above;
    const available = Math.max(80, (above ? spaceAbove : spaceBelow) - gap - margin);
    menu.style.maxHeight = `${available}px`;

    // Horizontal: default is inline-end (menu grows toward inline-start). Flip to
    // inline-start when that would clip the opposite viewport edge.
    const menuWidth = menu.offsetWidth;
    const vw = window.innerWidth;
    const rtl = getComputedStyle(this).direction === "rtl";
    // End-aligned occupies [tr.right - w, tr.right] in LTR, [tr.left, tr.left + w] in RTL.
    const endLeft = rtl ? tr.left : tr.right - menuWidth;
    const endRight = rtl ? tr.left + menuWidth : tr.right;
    const startLeft = rtl ? tr.right - menuWidth : tr.left;
    const startRight = rtl ? tr.right : tr.left + menuWidth;
    const overflow = (left: number, right: number) =>
      Math.max(0, margin - left) + Math.max(0, right - (vw - margin));
    const endOverflow = overflow(endLeft, endRight);
    const startOverflow = overflow(startLeft, startRight);
    // Prefer end alignment; flip only when start keeps more of the menu on screen.
    const start = endOverflow > 0 && startOverflow < endOverflow;
    if (start !== this.menuStart) this.menuStart = start;
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
    const items = this.focusableMenuItems();
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

  /** Interactive rows inside role=menu (menuitem + team radios). */
  private focusableMenuItems(): HTMLElement[] {
    return [
      ...(this.renderRoot?.querySelectorAll(
        '[role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"]'
      ) ?? []),
    ] as HTMLElement[];
  }

  private focusMenuItem(index: number): void {
    this.focusableMenuItems()[index]?.focus();
  }

  protected updated(changed: Map<string, unknown>): void {
    if (this.auth.configError) this.setAttribute("data-config-error", "");
    else this.removeAttribute("data-config-error");
    if (changed.has("menuOpen")) {
      if (this.menuOpen) {
        if (this.showTeams) void this.loadTeams();
        requestAnimationFrame(() => {
          this.placeMenu();
          this.focusMenuItem(0);
        });
      } else {
        this.menuAbove = false;
        this.menuStart = false;
      }
    }
    if (this.menuOpen && (changed.has("teams") || changed.has("teamsLoading"))) {
      requestAnimationFrame(() => this.placeMenu());
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
      return html`
        ${
          this.auth.configError
            ? html`<div class="alert alert-error config-error" role="alert">
                ${icons.alert}
                <div class="alert-body">${this.auth.configError}</div>
              </div>`
            : nothing
        }
        <button class="btn btn-primary btn-sm" @click=${() => openModal("sign-in")}>
          <slot>${this.t("signIn")}</slot>
        </button>
      `;
    }
    const label = user.name || user.email || user.phone || this.t("guestAccount");
    // Explicit src wins; otherwise Appwrite getPhoto for this user id.
    const photoUrl = this.src || avatarPhotoUrl(authStore.getClient(), user, 64);
    const showPhoto = !!photoUrl && photoUrl !== this.photoFailedUrl;
    return html`
      <button
        class="trigger"
        aria-haspopup="menu"
        aria-expanded=${this.menuOpen ? "true" : "false"}
        @click=${this.toggleMenu}
        aria-label=${label}
      >
        <span class="avatar"
          >${
            showPhoto
              ? html`<img
                  src=${photoUrl!}
                  alt=""
                  @error=${() => {
                    this.photoFailedUrl = photoUrl;
                  }}
                />`
              : avatarInitial(label)
          }</span
        >
      </button>
      ${
        this.menuOpen
          ? html`<div
              class="menu ${this.menuAbove ? "above" : ""} ${this.menuStart ? "start" : ""}"
              role="menu"
            >
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
                          ? html`<button
                              class="menu-item"
                              role="menuitem"
                              type="button"
                              aria-disabled="true"
                              aria-busy="true"
                              @click=${(e: Event) => e.preventDefault()}
                            >
                              <span class="spinner" aria-hidden="true"></span>
                              <span class="sr-only">${this.t("loading")}</span>
                            </button>`
                          : this.teams.length === 0
                            ? html`<button
                                class="menu-item"
                                role="menuitem"
                                type="button"
                                aria-disabled="true"
                                @click=${(e: Event) => e.preventDefault()}
                              >
                                ${this.t("noTeams")}
                              </button>`
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
              ${this.renderCustomMenuItems()}
              <slot name="menu-items"></slot>
              ${
                this.showTeams
                  ? html`<button
                      class="menu-item"
                      role="menuitem"
                      @click=${() => {
                        this.menuOpen = false;
                        openModal("account", "teams");
                      }}
                    >
                      ${icons.users} ${this.t("manageTeams")}
                    </button>`
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

  private renderCustomMenuItems() {
    if (!this.menuItems?.length) return nothing;
    return this.menuItems.map((item) => {
      if (item.href) {
        const target = item.target;
        return html`<a
          class="menu-item"
          role="menuitem"
          href=${item.href}
          target=${target || nothing}
          rel=${target === "_blank" ? "noopener noreferrer" : nothing}
          @click=${() => {
            this.menuOpen = false;
          }}
        >
          ${item.label}
        </a>`;
      }
      const actionId = item.actionId;
      return html`<button
        class="menu-item"
        role="menuitem"
        type="button"
        @click=${() => {
          this.menuOpen = false;
          if (actionId) {
            this.dispatchEvent(
              new CustomEvent("authui-menu-action", {
                detail: { actionId },
                bubbles: true,
                composed: true,
              })
            );
          }
        }}
      >
        ${item.label}
      </button>`;
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "authui-user-button": AuthUIUserButton;
  }
}
