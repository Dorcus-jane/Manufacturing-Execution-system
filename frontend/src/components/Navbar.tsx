import { Link } from "react-router-dom";
import "./Navbar.css";

function Navbar() {
  return (
    <nav>
      <h2>DOJO HUB 2026</h2>

      <div>
        <Link to="/executive">Executive</Link>

        <Link to="/manager">Manager</Link>

        <Link to="/operator">Operator</Link>

        <Link to="/blueprints">Blueprints</Link>
      </div>
    </nav>
  );
}

export default Navbar;
