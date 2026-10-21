import Navbar from "../components/Navbar";
import "./Blueprints.css";


function Blueprints(){

    return (

        <div>

            <Navbar/>


            <div className="blueprint-page">


                <h1>
                    Blueprint Editor
                </h1>


                <button className="create-btn">
                    + Create Blueprint
                </button>



                <div className="blueprint-card">


                    <h2>
                        Smartphone Assembly
                    </h2>


                    <p>
                        Version: 1
                    </p>


                    <h3>
                        Process Stages
                    </h3>


                    <ul>

                        <li>
                            Stage 1: Component Assembly
                        </li>

                        <li>
                            Stage 2: Quality Testing
                        </li>

                        <li>
                            Stage 3: Packaging
                        </li>

                    </ul>


                    <h3>
                        Checklist
                    </h3>


                    <ul>

                        <li>
                            ✓ Check screen installation
                        </li>

                        <li>
                            ✓ Test battery
                        </li>

                        <li>
                            ✓ Verify packaging
                        </li>

                    </ul>


                </div>


            </div>


        </div>

    )

}


export default Blueprints;