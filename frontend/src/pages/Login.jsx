// Login.jsx
import React, { useState, useContext } from 'react';
import axios from 'axios';
import { Button, Alert, Input, Checkbox, Form, Typography, Divider, Space } from "antd";
import { UserOutlined, LockOutlined, ClockCircleOutlined, TeamOutlined, BarChartOutlined } from '@ant-design/icons';
import { AppContext } from './App';
import { useNavigate } from 'react-router-dom';
import Logo from 'assets/logo.svg';
import jwt_decode from 'jwt-decode';

const { Title, Text } = Typography;

export default () => {
    const [form] = Form.useForm();
    const { setAuth } = useContext(AppContext);
    const navigate = useNavigate();
    const [remember, setRemember] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loginError, setLoginError] = useState(false);

    const handleSubmit = async (values) => {
        setLoading(true);
        setLoginError(false);
        try {
            localStorage.removeItem('auth');
            const response = await axios.post('/api/token/', {
                username: values.username,
                password: values.password,
                remember
            }, { withCredentials: true });

            const decodedToken = jwt_decode(response.data.access);
            const _auth = {
                access_token:  response.data.access,
                refresh_token: response.data.refresh,
                username:      values.username,
                first_name:    decodedToken.first_name,
                last_name:     decodedToken.last_name,
                num:           decodedToken.num,
                email:         decodedToken.email,
                groups:        decodedToken.groups,
                isAdmin:       decodedToken.isAdmin,
                isRH:          decodedToken.isRH,
                isChefe:       decodedToken.isChefe    || false,
                deps_chefe:    decodedToken.deps_chefe || [],
                dep:           decodedToken.dep        || '',
                tp_hor:        decodedToken.tp_hor     || '',
                items:         decodedToken.items
            };

            localStorage.setItem('auth', JSON.stringify(_auth));
            axios.defaults.headers.common.Authorization = `Bearer ${_auth.access_token}`;
            setAuth({ isAuthenticated: true, ..._auth });

            // ← usar navigate em vez de window.location.href
            // o PublicRoute detecta isAuthenticated=true e redireciona para /app/rh/ferias
            navigate('/app/rh/ferias', { replace: true });
        } catch (e) {
            setLoginError(true);
        } finally {
            setLoading(false);
        }
    };

    // ... resto do JSX inalterado (o return com o form)
    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2027 50%, #203a43 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            <div style={{
                display: 'flex',
                width: '100%',
                maxWidth: '900px',
                minHeight: '500px',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
            }}>
                {/* Painel esquerdo de branding */}
                <div className="login-branding-panel" style={{
                    flex: 1,
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                    backdropFilter: 'blur(10px)',
                    borderRight: '1px solid rgba(255,255,255,0.1)',
                    padding: '48px 40px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    color: '#fff'
                }}>
                    <Logo style={{ height: '80px', marginBottom: '32px', width: '100%', filter: 'brightness(0) invert(1)' }} />
                    <Title level={2} style={{ color: '#fff', margin: 0 }}>Portal RH</Title>
                    <Text style={{ color: 'rgba(255,255,255,0.6)', marginTop: 8, textAlign: 'center' }}>
                        Sistema de Gestão de Recursos Humanos
                    </Text>
                    <Divider style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '32px 0' }} />
                    <Space direction="vertical" size={16} style={{ width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'rgba(255,255,255,0.7)' }}>
                            <ClockCircleOutlined style={{ fontSize: 18 }} />
                            <Text style={{ color: 'rgba(255,255,255,0.7)' }}>Registo de Picagens</Text>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'rgba(255,255,255,0.7)' }}>
                            <TeamOutlined style={{ fontSize: 18 }} />
                            <Text style={{ color: 'rgba(255,255,255,0.7)' }}>Gestão de Colaboradores</Text>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'rgba(255,255,255,0.7)' }}>
                            <BarChartOutlined style={{ fontSize: 18 }} />
                            <Text style={{ color: 'rgba(255,255,255,0.7)' }}>Processamento Salarial</Text>
                        </div>
                    </Space>
                </div>

                {/* Painel direito do formulário */}
                <div style={{
                    flex: 1,
                    background: '#fff',
                    padding: '48px 40px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                }}>
                    <Title level={3} style={{ marginBottom: 8 }}>Bem-vindo</Title>
                    <Text type="secondary" style={{ marginBottom: 32, display: 'block' }}>
                        Introduza as suas credenciais para aceder
                    </Text>

                    {loginError && (
                        <Alert
                            message="Credenciais inválidas"
                            description="Verifique o utilizador e a palavra-passe."
                            type="error"
                            showIcon
                            closable
                            onClose={() => setLoginError(false)}
                            style={{ marginBottom: 24 }}
                        />
                    )}

                    <Form form={form} layout="vertical" onFinish={handleSubmit}>
                        <Form.Item
                            name="username"
                            label="Utilizador"
                            rules={[{ required: true, message: 'Introduza o utilizador' }]}
                        >
                            <Input
                                prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
                                placeholder="Nome de utilizador"
                                size="large"
                                autoComplete="username"
                            />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            label="Palavra-passe"
                            rules={[{ required: true, message: 'Introduza a palavra-passe' }]}
                        >
                            <Input.Password
                                prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                                placeholder="Palavra-passe"
                                size="large"
                                autoComplete="current-password"
                            />
                        </Form.Item>

                        <Form.Item>
                            <Checkbox
                                checked={remember}
                                onChange={e => setRemember(e.target.checked)}
                            >
                                Manter sessão iniciada
                            </Checkbox>
                        </Form.Item>

                        <Form.Item style={{ marginBottom: 0 }}>
                            <Button
                                type="primary"
                                htmlType="submit"
                                size="large"
                                loading={loading}
                                style={{ width: '100%', height: 48, borderRadius: 8 }}
                            >
                                Entrar
                            </Button>
                        </Form.Item>
                    </Form>
                </div>
            </div>
        </div>
    );
};