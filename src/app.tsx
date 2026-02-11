import React from 'react'
import * as ReactDOM from 'react-dom/client';
import {BrowserRouter, HashRouter, Route, Routes} from "react-router-dom";

import Layout from "./Layout";


const App = () => {
    return (
        <HashRouter>
            <Layout />
        </HashRouter>
    );
}


function render() {
  const root = ReactDOM.createRoot(document.getElementById("app"));
  root.render(<App/>);
}

render();
