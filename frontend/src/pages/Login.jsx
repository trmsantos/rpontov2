import React, { useState, useContext } from 'react';
import axios from 'axios';
import { Button, Alert, Input, Checkbox, Form, Typography, Divider, Space, Modal, Steps } from "antd";
import {
    UserOutlined, LockOutlined, ClockCircleOutlined,
    TeamOutlined, BarChartOutlined, MailOutlined,
    CheckCircleOutlined, ArrowLeftOutlined
} from '@ant-design/icons';
import { AppContext } from './App';
import { useNavigate } from 'react-router-dom';
import Logo from 'assets/logo.svg';
import jwt_decode from 'jwt-decode';

const { Title, Text } = Typography;


const ModalRecuperarPassword = ({ visible, onClose }) => {
    const [email,   setEmail]   = useState('');
    const [loading, setLoading] = useState(false);
    const [sent,    setSent]    = useState(false);
    const [error,   setError]   = useState('');

    const reset = () => {
        setEmail('');
        setSent(false);
        setError('');
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const handleRequest = async () => {
        if (!email.trim()) return;
        setLoading(true);
        setError('');
        try {
            await axios.post('/api/password-reset/request/', {
                email: email.trim()
            });
            setSent(true);
        } catch (e) {
            setError(e.response?.data?.title || 'Erro ao processar pedido.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            open={visible}
            onCancel={handleClose}
            footer={null}
            title={null}
            destroyOnClose
            centered
            width={460}
        >
            <div style={{ padding: '16px 0' }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: 16,
                        background: sent
                            ? 'linear-gradient(135deg, #059669, #10B981)'
                            : 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 12px', boxShadow: '0 4px 12px rgba(79,70,229,0.3)'
                    }}>
                        {sent
                            ? <CheckCircleOutlined style={{ color: '#fff', fontSize: 24 }} />
                            : <LockOutlined       style={{ color: '#fff', fontSize: 24 }} />
                        }
                    </div>
                    <Title level={4} style={{ margin: 0 }}>
                        {sent ? 'Email enviado!' : 'Recuperar palavra-passe'}
                    </Title>
                </div>

                {error && (
                    <Alert
                        message={error}
                        type="error"
                        showIcon
                        closable
                        onClose={() => setError('')}
                        style={{ marginBottom: 16, borderRadius: 8 }}
                    />
                )}

                {!sent && (
                    <div>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: 13 }}>
                            Introduza o email associado à sua conta. Receberá um link para redefinir a palavra-passe.
                        </Text>

                        <div style={{ marginBottom: 16 }}>
                            <label style={{
                                fontSize: 11, fontWeight: 700, color: '#666',
                                textTransform: 'uppercase', display: 'block', marginBottom: 4
                            }}>
                                Email
                            </label>
                            <Input
                                prefix={<MailOutlined style={{ color: '#bfbfbf' }} />}
                                placeholder="exemplo@elastictek.com"
                                size="large"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                onPressEnter={handleRequest}
                                type="email"
                                style={{ borderRadius: 8 }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <Button onClick={handleClose} style={{ borderRadius: 8 }}>
                                Cancelar
                            </Button>
                            <Button
                                type="primary"
                                loading={loading}
                                onClick={handleRequest}
                                disabled={!email.trim()}
                                style={{ borderRadius: 8, background: '#4F46E5', borderColor: '#4F46E5' }}
                            >
                                Enviar link
                            </Button>
                        </div>
                    </div>
                )}

                {sent && (
                    <div style={{ textAlign: 'center' }}>
                        <Alert
                            message="Verifique o seu email"
                            description={
                                <span>
                                    Se <strong>{email}</strong> estiver associado a uma conta,
                                    receberá um email com o link de recuperação em breve.
                                    O link é válido durante <strong>1 hora</strong>.
                                </span>
                            }
                            type="success"
                            showIcon
                            style={{ marginBottom: 20, borderRadius: 8, textAlign: 'left' }}
                        />
                        <Text type="secondary" style={{ display: 'block', marginBottom: 20, fontSize: 12 }}>
                            Não recebeu o email? Verifique a pasta de spam ou tente novamente.
                        </Text>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                            <Button
                                onClick={reset}
                                style={{ borderRadius: 8 }}
                            >
                                Tentar novamente
                            </Button>
                            <Button
                                type="primary"
                                size="large"
                                onClick={handleClose}
                                style={{
                                    borderRadius: 8, background: '#4F46E5',
                                    borderColor: '#4F46E5', fontWeight: 700
                                }}
                            >
                                Fechar
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};


export default () => {
    const [form] = Form.useForm();
    const { setAuth } = useContext(AppContext);
    const navigate = useNavigate();
    const [remember, setRemember]       = useState(false);
    const [loading, setLoading]         = useState(false);
    const [loginError, setLoginError]   = useState(false);
    const [errorMsg, setErrorMsg]       = useState('');
    const [showReset, setShowReset]     = useState(false);

    const handleSubmit = async (values) => {
        setLoading(true);
        setLoginError(false);
        setErrorMsg('');
        try {
            localStorage.removeItem('auth');
            const response = await axios.post('/api/token/', {
                username: values.username.trim().toUpperCase(),
                password: values.password,
                remember
            }, { withCredentials: true });

            const decodedToken = jwt_decode(response.data.access);
            const _auth = {
                access_token:        response.data.access,
                refresh_token:       response.data.refresh,
                username:            values.username.trim().toUpperCase(),
                first_name:          decodedToken.first_name,
                last_name:           decodedToken.last_name,
                num:                 decodedToken.num,
                email:               decodedToken.email,
                groups:              decodedToken.groups,
                isAdmin:             decodedToken.isAdmin,
                isRH:                decodedToken.isRH,
                isChefe:             decodedToken.isChefe             || false,
                isChefeTurno:        decodedToken.isChefeTurno        || false,
                deps_chefe:          decodedToken.deps_chefe          || [],
                equipas_chefeturno:  decodedToken.equipas_chefeturno  || [],
                dep:                 decodedToken.dep                 || '',
                tp_hor:              decodedToken.tp_hor              || '',
                items:               decodedToken.items
            };

            localStorage.setItem('auth', JSON.stringify(_auth));
            axios.defaults.headers.common.Authorization = `Bearer ${_auth.access_token}`;
            setAuth({ isAuthenticated: true, ..._auth });
            navigate('/app/rh/ferias', { replace: true });
        } catch (e) {
            setLoginError(true);
            const data = e.response?.data;
            if (data?.detail) {
                setErrorMsg(typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail));
            } else {
                setErrorMsg('Credenciais inválidas. Verifique o nº de funcionário e a palavra-passe.');
            }
        } finally {
            setLoading(false);
        }
    };

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
                {/* Painel esquerdo */}
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

                {/* Painel direito */}
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
                        Introduza o seu número de funcionário para aceder
                    </Text>

                    {loginError && (
                        <Alert
                            message="Falha na autenticação"
                            description={errorMsg}
                            type="error"
                            showIcon
                            closable
                            onClose={() => setLoginError(false)}
                            style={{ marginBottom: 24, borderRadius: 8 }}
                        />
                    )}

                    <Form form={form} layout="vertical" onFinish={handleSubmit}>
                        <Form.Item
                            name="username"
                            label={<span style={{ fontSize: 12, fontWeight: 700, color: '#555' }}>Número de Funcionário</span>}
                            rules={[
                                { required: true, message: 'Introduza o nº de funcionário' },
                                { pattern: /^F\d{3,5}$/i, message: 'Formato inválido (ex: F00242)' }
                            ]}
                            normalize={v => v?.toUpperCase()}
                        >
                            <Input
                                prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
                                placeholder="Ex: F00242"
                                size="large"
                                autoComplete="username"
                                style={{ borderRadius: 8 }}
                            />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            label={<span style={{ fontSize: 12, fontWeight: 700, color: '#555' }}>Palavra-passe</span>}
                            rules={[{ required: true, message: 'Introduza a palavra-passe' }]}
                        >
                            <Input.Password
                                prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                                placeholder="Palavra-passe"
                                size="large"
                                autoComplete="current-password"
                                style={{ borderRadius: 8 }}
                            />
                        </Form.Item>

                        <Form.Item style={{ marginBottom: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Checkbox
                                    checked={remember}
                                    onChange={e => setRemember(e.target.checked)}
                                >
                                    <span style={{ fontSize: 13 }}>Manter sessão</span>
                                </Checkbox>
                                <a
                                    onClick={() => setShowReset(true)}
                                    style={{
                                        fontSize: 13,
                                        color: '#4F46E5',
                                        cursor: 'pointer',
                                        fontWeight: 600
                                    }}
                                >
                                    Esqueci a palavra-passe
                                </a>
                            </div>
                        </Form.Item>

                        <Form.Item style={{ marginBottom: 0 }}>
                            <Button
                                type="primary"
                                htmlType="submit"
                                size="large"
                                loading={loading}
                                style={{
                                    width: '100%',
                                    height: 48,
                                    borderRadius: 8,
                                    background: '#4F46E5',
                                    borderColor: '#4F46E5',
                                    fontWeight: 700,
                                    fontSize: 15
                                }}
                            >
                                Entrar
                            </Button>
                        </Form.Item>
                    </Form>

                    <Text type="secondary" style={{
                        display: 'block', textAlign: 'center',
                        marginTop: 24, fontSize: 11, color: '#aaa'
                    }}>
                        Acesso exclusivo para colaboradores
                    </Text>
                </div>
            </div>

            <ModalRecuperarPassword
                visible={showReset}
                onClose={() => setShowReset(false)}
            />
        </div>
    );
};