import { Key, Bell, Database, Shield } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card';

export function Settings() {
  return (
    <div className="min-h-screen">
      <Header title="Settings" />

      <div className="p-6 max-w-4xl">
        <div className="space-y-6">
          {/* API Configuration */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Key className="h-5 w-5 text-primary-400" />
                <CardTitle>API Configuration</CardTitle>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    API Endpoint
                  </label>
                  <input
                    type="text"
                    className="input w-full"
                    defaultValue="http://localhost:8000"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    WebSocket Endpoint
                  </label>
                  <input
                    type="text"
                    className="input w-full"
                    defaultValue="ws://localhost:8000/ws/metrics"
                    readOnly
                  />
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-primary-400" />
                <CardTitle>Notifications</CardTitle>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <label className="flex items-center justify-between">
                  <span className="text-dark-300">Enable browser notifications</span>
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded border-dark-600 bg-dark-800 text-primary-600 focus:ring-primary-500"
                  />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-dark-300">Sound alerts for critical issues</span>
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded border-dark-600 bg-dark-800 text-primary-600 focus:ring-primary-500"
                  />
                </label>
              </div>
            </CardBody>
          </Card>

          {/* Data Retention */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-primary-400" />
                <CardTitle>Data Retention</CardTitle>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Metrics retention period
                  </label>
                  <select className="input w-full">
                    <option value="7">7 days</option>
                    <option value="14">14 days</option>
                    <option value="30" selected>
                      30 days
                    </option>
                    <option value="90">90 days</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Alert history retention
                  </label>
                  <select className="input w-full">
                    <option value="30">30 days</option>
                    <option value="90" selected>
                      90 days
                    </option>
                    <option value="365">1 year</option>
                  </select>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary-400" />
                <CardTitle>Security</CardTitle>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <label className="flex items-center justify-between">
                  <span className="text-dark-300">Require API key for all requests</span>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-5 w-5 rounded border-dark-600 bg-dark-800 text-primary-600 focus:ring-primary-500"
                  />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-dark-300">Log all API requests</span>
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded border-dark-600 bg-dark-800 text-primary-600 focus:ring-primary-500"
                  />
                </label>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
