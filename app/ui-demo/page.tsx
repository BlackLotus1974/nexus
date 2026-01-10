'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button, Card, CardHeader, CardBody, CardFooter, Input, Select, Modal, ModalFooter } from '@/components/ui';

export default function UIDemoPage() {
  const [showModal, setShowModal] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectValue, setSelectValue] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      alert('Form submitted!');
    }, 1500);
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            UI Components Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Preview and test all available UI components
          </p>
        </div>

        {/* Buttons */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Buttons</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Variants</h3>
                <div className="flex flex-wrap gap-3">
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="danger">Danger</Button>
                  <Button variant="ghost">Ghost</Button>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Sizes</h3>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="sm">Small</Button>
                  <Button size="md">Medium</Button>
                  <Button size="lg">Large</Button>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">States</h3>
                <div className="flex flex-wrap gap-3">
                  <Button loading>Loading</Button>
                  <Button disabled>Disabled</Button>
                  <Button fullWidth>Full Width</Button>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Cards */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Cards</h2>
          </CardHeader>
          <CardBody>
            <div className="grid md:grid-cols-2 gap-6">
              <Card hover>
                <CardBody>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Basic Card</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    This is a basic card with hover effect.
                  </p>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Card with Header</h3>
                </CardHeader>
                <CardBody>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    This card has a header section.
                  </p>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Full Card</h3>
                </CardHeader>
                <CardBody>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    This card has all sections.
                  </p>
                </CardBody>
                <CardFooter>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm">Cancel</Button>
                    <Button variant="primary" size="sm">Save</Button>
                  </div>
                </CardFooter>
              </Card>
            </div>
          </CardBody>
        </Card>

        {/* Form Inputs */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Form Inputs</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Input
                  label="Full Name"
                  placeholder="Enter your name"
                  fullWidth
                />

                <Input
                  label="Email"
                  type="email"
                  placeholder="you@example.com"
                  fullWidth
                  leftIcon={
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  }
                />

                <Input
                  label="Password"
                  type="password"
                  placeholder="Enter password"
                  fullWidth
                  helperText="Must be at least 8 characters"
                />

                <Input
                  label="With Error"
                  placeholder="This has an error"
                  error="This field is required"
                  fullWidth
                />

                <Select
                  label="Organization Type"
                  placeholder="Select an option"
                  fullWidth
                  options={[
                    { value: 'nonprofit', label: 'Non-profit' },
                    { value: 'foundation', label: 'Foundation' },
                    { value: 'charity', label: 'Charity' },
                    { value: 'other', label: 'Other' },
                  ]}
                  value={selectValue}
                  onChange={(e) => setSelectValue(e.target.value)}
                />

                <Input
                  label="Search"
                  type="search"
                  placeholder="Search..."
                  fullWidth
                  leftIcon={
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  }
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
                <Button type="submit" loading={loading}>
                  Submit Form
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        {/* Modal */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Modal</h2>
          </CardHeader>
          <CardBody>
            <Button onClick={() => setShowModal(true)}>
              Open Modal
            </Button>

            <Modal
              isOpen={showModal}
              onClose={() => setShowModal(false)}
              title="Example Modal"
              size="md"
            >
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-400">
                  This is an example modal dialog. It supports various sizes, keyboard navigation,
                  focus trapping, and accessibility features.
                </p>

                <Input
                  label="Modal Input"
                  placeholder="Try typing here"
                  fullWidth
                />

                <ModalFooter>
                  <Button variant="ghost" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={() => setShowModal(false)}>
                    Confirm
                  </Button>
                </ModalFooter>
              </div>
            </Modal>
          </CardBody>
        </Card>

        {/* Stats Cards Example */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Stats Cards</h2>
          </CardHeader>
          <CardBody>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card hover padding={false} className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">1,234</p>
                  </div>
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                </div>
              </Card>

              <Card hover padding={false} className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Revenue</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">$45.2K</p>
                  </div>
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </Card>

              <Card hover padding={false} className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">892</p>
                  </div>
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
              </Card>

              <Card hover padding={false} className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Growth</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">+23%</p>
                  </div>
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                    <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
              </Card>
            </div>
          </CardBody>
        </Card>
      </div>
    </DashboardLayout>
  );
}
