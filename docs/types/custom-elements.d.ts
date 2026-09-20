import "react";

type El<P = Record<string, unknown>> = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLElement> & P,
  HTMLElement
>;

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "authui-config": El<{ endpoint?: string; project?: string; methods?: string; name?: string }>;
      "authui-modal": El<{ view?: string; open?: boolean }>;
      "authui-button": El<{ view?: string; variant?: string; size?: string }>;
      "authui-user-button": El<{ src?: string }>;
      "authui-sign-in": El<{ view?: string; embedded?: boolean }>;
      "authui-account": El<{ tab?: string; embedded?: boolean }>;
      "authui-show": El<{ when?: string; unless?: string }>;
    }
  }
}
