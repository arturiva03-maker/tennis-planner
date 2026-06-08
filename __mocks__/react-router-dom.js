// Manueller Jest-Mock: react-router-dom v7 nutzt eine "exports"-Map, die der
// alte CRA-Jest-Resolver (react-scripts 5) nicht auflösen kann. Für Unit-Tests
// reichen einfache Passthrough-Stubs.
const React = require("react");

const passthrough = ({ children }) => React.createElement(React.Fragment, null, children);

module.exports = {
  BrowserRouter: passthrough,
  MemoryRouter: passthrough,
  Routes: passthrough,
  Route: passthrough,
  Link: ({ children, to, ...rest }) => React.createElement("a", { href: to, ...rest }, children),
  NavLink: ({ children, to, ...rest }) => React.createElement("a", { href: to, ...rest }, children),
  Outlet: passthrough,
  Navigate: () => null,
  useSearchParams: () => [new URLSearchParams(""), () => {}],
  useNavigate: () => () => {},
  useParams: () => ({}),
  useLocation: () => ({ pathname: "/", search: "", hash: "", state: null }),
};
