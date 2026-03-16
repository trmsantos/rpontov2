import React, { useEffect, useState, Suspense, lazy, useContext } from 'react';
import * as ReactDOM from 'react-dom/client';
import 'react-data-grid/lib/styles.css';
import { useRoutes, BrowserRouter, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import './app.css';
import { json } from "utils/object";
import { useSubmitting } from "utils";
import GridLayout from './GridLayout';
import axios from 'axios';

const NotFound              = lazy(() => import('./404'));
const Main                  = lazy(() => import('./Main'));
const Login                 = lazy(() => import('./Login'));
const RegistosRH            = lazy(() => import('./RegistosRH'));
const RegistosRHv3          = lazy(() => import('./RegistosRHv3'));
const PlanRH                = lazy(() => import('./PlanRH'));
const Turnos                = lazy(() => import('./TesteTurnos'));
const JustificacoesPessoal  = lazy(() => import('./JustificacoesPessoal'));
const JustificacoesChefe    = lazy(() => import('./JustificacoesChefe'));
const JustificacoesRH       = lazy(() => import('./JustificacoesRH'));
const GestaoDepart          = lazy(() => import('./GestaoDepart'));
const ProcessamentoSalarial = lazy(() => import('./ProcessamentoSalarial'));
const PedidoFerias          = lazy(() => import('./PedidoFerias'));
const GestaoFerias          = lazy(() => import('./GestaoFerias'));
const MeuHorario            = lazy(() => import('./MeuHorario'));
const GestaoChefes          = lazy(() => import('./GestaoChefes'));
const RegistosRHChefe       = lazy(() => import('./RegistosRHChefe'));
const ColaboradoresDepartamento = lazy(() => import('./ColaboradoresDepartamento'));
const RegistosRHPessoal     = lazy(() => import('./RegistosRHPessoal'));
const TrocasTurno           = lazy(() => import('./TrocasTurno'));
const ResetPassword         = lazy(() => import('./ResetPassword'));

export const MediaContext = React.createContext({});
export const SocketContext = React.createContext({});
export const AppContext    = React.createContext({});

/* ── Guarda de rota pública: redireciona utilizadores autenticados ── */
const PublicRoute = ({ children }) => {
    const { auth, authLoading } = useContext(AppContext);
    if (authLoading) return <Spin />;
    return auth.isAuthenticated
        ? <Navigate to="/app/rh/ferias" replace />
        : children;
};

/* ── Guarda de rota privada: redireciona não-autenticados para login ── */
const PrivateRoute = ({ children }) => {
    const { auth, authLoading } = useContext(AppContext);
    if (authLoading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <Spin size="large" />
        </div>
    );
    return auth.isAuthenticated
        ? children
        : <Navigate to="/app/login" replace />;
};

/* ── Guarda de rota: só DPROD ���─ */
const ProtectedDPROD = ({ children }) => {
    const { auth, authLoading } = useContext(AppContext);
    if (authLoading) return <Spin />;
    const pertenceDPROD =
        auth?.dep === 'DPROD' ||
        (auth?.deps_chefe || []).includes('DPROD');
    return pertenceDPROD
        ? children
        : <Navigate to="/app/rh/ferias" replace />;
};

/* ── Rotas ────────────────────────────────────────── */
const RenderRouter = () => {
    const element = useRoutes([

        {
            path: '/app/login',
            element: (
                <PublicRoute>
                    <Suspense fallback={<Spin />}><Login /></Suspense>
                </PublicRoute>
            )
        },

        {
            path: '/reset-password/:uid/:token',
            element: (
                <Suspense fallback={<Spin />}><ResetPassword /></Suspense>
            )
        },

        {
            path: '/app',
            element: (
                <PrivateRoute>
                    <GridLayout />
                </PrivateRoute>
            ),
            children: [
                /* Redirect default: /app → /app/rh/ferias */
                { index: true, element: <Navigate to="/app/rh/ferias" replace /> },

                /* ── RH ── */
                { path: "rh/registos",
                  element: <Suspense fallback={<Spin />}><RegistosRH key="lst-rp-rh" /></Suspense> },
                { path: "rh/registosv3",
                  element: <Suspense fallback={<Spin />}><RegistosRHv3 key="lst-rp-rh3" /></Suspense> },
                { path: "rh/plan",
                  element: <Suspense fallback={<Spin />}><PlanRH key="lst-pl-rh" /></Suspense> },
                { path: "rh/departamentos",
                  element: <Suspense fallback={<Spin />}><GestaoDepart /></Suspense> },
                { path: "rh/processamento",
                  element: <Suspense fallback={<Spin />}><ProcessamentoSalarial /></Suspense> },
                { path: "rh/justificacoes/rh",
                  element: <Suspense fallback={<Spin />}><JustificacoesRH /></Suspense> },

                /* ── Área Pessoal ── */
                { path: "rh/registospessoal",
                  element: <Suspense fallback={<Spin />}><RegistosRHChefe key="picagens-pessoal" /></Suspense> },
                { path: "rh/planpessoal",
                  element: <Suspense fallback={<Spin />}><Turnos key="plano-pessoal" /></Suspense> },

                /* ── Comum ── */
                { path: "rh/turnos",
                  element: <Suspense fallback={<Spin />}><Turnos /></Suspense> },
                { path: "rh/ferias",
                  element: <Suspense fallback={<Spin />}><PedidoFerias /></Suspense> },
                { path: "rh/justificacoes/pessoal",
                  element: <Suspense fallback={<Spin />}><JustificacoesPessoal /></Suspense> },

                /* ── RH + Chefe ── */
                { path: "rh/gestao-ferias",
                  element: <Suspense fallback={<Spin />}><GestaoFerias /></Suspense> },
                { path: "rh/justificacoes/chefe",
                  element: <Suspense fallback={<Spin />}><JustificacoesChefe /></Suspense> },
                { path: "rh/picagens-departamento",
                  element: <Suspense fallback={<Spin />}><RegistosRHChefe key="picagens-dep" /></Suspense> },
                { path: "rh/colaboradores-departamento",
                  element: <Suspense fallback={<Spin />}><ColaboradoresDepartamento /></Suspense> },

                /* ── DPROD — Trocas de Turno ── */
                { path: "rh/trocas-turno",
                  element: (
                      <ProtectedDPROD>
                          <Suspense fallback={<Spin />}>
                              <TrocasTurno />
                          </Suspense>
                      </ProtectedDPROD>
                  )
                },

                /* ── Outras ── */
                { path: "horario",
                  element: <Suspense fallback={<Spin />}><MeuHorario /></Suspense> },
                { path: "gestao-chefes",
                  element: <Suspense fallback={<Spin />}><GestaoChefes /></Suspense> },

                /* ── Retrocompatibilidade ── */
                { path: "rh/registos-chefe",
                  element: <Suspense fallback={<Spin />}><RegistosRHChefe /></Suspense> },
                { path: "rh/registos-pessoal",
                  element: <Suspense fallback={<Spin />}><RegistosRHPessoal /></Suspense> },
/*                   --reset da password -- 
                { path: "reset-password/:uid/:token",
                  element: <Suspense fallback={<Spin />}><ResetPassword /></Suspense> } */,
            ]
        },
        { path: '/', element: <Main />, children: [] },
        { path: "*", element: <Suspense fallback={<Spin />}><NotFound /></Suspense> }
    ]);

    return element;
};

/* ── App root ── */
const App = () => {
    const submitting                    = useSubmitting(true);
    const [auth, setAuth]               = useState({ isAuthenticated: false });
    const [authLoading, setAuthLoading] = useState(true);

    useEffect(() => {
        const _auth = json(localStorage.getItem('auth'));
        if (_auth?.access_token) {
            axios.defaults.headers.common.Authorization = `Bearer ${_auth.access_token}`;

            const authNormalizado = {
                isAuthenticated: true,
                ..._auth,
                dep:       _auth.dep       || '',
                tp_hor:    _auth.tp_hor    || '',
                isChefe:   _auth.isChefe   || false,
                deps_chefe: _auth.deps_chefe || [],
            };

            setAuth(authNormalizado);
            if (process.env.NODE_ENV === 'development') {
                console.log('[App] auth normalizado:', authNormalizado);
            }
        }
        setAuthLoading(false);
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        submitting.end();
        return () => controller.abort();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('auth');
        axios.defaults.headers.common.Authorization = null;
        setAuth({ isAuthenticated: false });
        window.location.href = '/app/login';
    };

    return (
        <BrowserRouter>
            <AppContext.Provider value={{ auth, setAuth, handleLogout, authLoading }}>
                <SocketContext.Provider value={{}}>
                    <RenderRouter />
                </SocketContext.Provider>
            </AppContext.Provider>
        </BrowserRouter>
    );
};

export default App;

const container = document.getElementById("app");
const root = ReactDOM.createRoot(container);
root.render(<App />);