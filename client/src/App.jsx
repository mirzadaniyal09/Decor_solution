import { Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import ShopPage from './pages/ShopPage.jsx';
import ProductPage from './pages/ProductPage.jsx';
import CartPage from './pages/CartPage.jsx';
import CheckoutPage from './pages/CheckoutPage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import TermsPage from './pages/TermsPage.jsx';
import RefundPage from './pages/RefundPage.jsx';
import PrivacyPage from './pages/PrivacyPage.jsx';
import ShippingPage from './pages/ShippingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import AdminProductsPage from './pages/AdminProductsPage.jsx';
import SiteHeader from './components/SiteHeader.jsx';
import SiteFooter from './components/SiteFooter.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import RequireRole from './components/RequireRole.jsx';

export default function App() {
    return (
        <div>
            <SiteHeader />

            <main className="container main">
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/shop" element={<ShopPage />} />
                    <Route path="/product/:slug" element={<ProductPage />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="/terms" element={<TermsPage />} />
                    <Route path="/refund" element={<RefundPage />} />
                    <Route path="/privacy" element={<PrivacyPage />} />
                    <Route path="/shipping" element={<ShippingPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignupPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route
                        path="/account"
                        element={
                            <RequireAuth>
                                <AccountPage />
                            </RequireAuth>
                        }
                    />
                    <Route
                        path="/admin/products"
                        element={
                            <RequireRole role="admin">
                                <AdminProductsPage />
                            </RequireRole>
                        }
                    />
                </Routes>
            </main>

            <SiteFooter />
        </div>
    );
}
