import React from 'react';
import { useNavigate } from 'react-router-dom';

const NotFoundPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="text-center max-w-md">
                {/* Illustration */}
                <div className="relative inline-flex items-center justify-center mb-8">
                    <div className="w-40 h-40 rounded-full bg-blue-50 flex items-center justify-center">
                        <span className="text-7xl font-black text-blue-200 select-none">404</span>
                    </div>
                    <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shadow">
                        <span className="text-red-500 text-xl">✕</span>
                    </div>
                </div>

                <h1 className="text-3xl font-black text-slate-800 mb-3">Página não encontrada</h1>
                <p className="text-slate-500 text-base mb-8 leading-relaxed">
                    A página que tentou aceder está indisponível ou não existe.
                    <br />Por favor verifique o endereço ou regresse ao início.
                </p>

                <button
                    onClick={() => navigate('/app')}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Ir para a página inicial
                </button>
            </div>
        </div>
    );
};

export default NotFoundPage;