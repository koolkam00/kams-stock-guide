import MarketOverview from '../components/dashboard/MarketOverview';
import Navbar from '../components/layout/Navbar';
import PortfolioSection from '../components/dashboard/PortfolioSection';

const Dashboard = () => {
    return (
        <div className="min-h-screen bg-finance-bg pb-12">
            <Navbar />
            <main className="max-w-6xl mx-auto px-4 pt-8">
                <MarketOverview />

                <PortfolioSection />
            </main>
        </div>
    );
};

export default Dashboard;
