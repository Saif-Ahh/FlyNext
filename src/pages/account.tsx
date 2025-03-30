import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { FaUser, FaLock, FaEnvelope, FaPhone, FaPassport, FaArrowLeft, FaSave, FaEdit, FaImage } from 'react-icons/fa';
import Image from 'next/image';

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  profilePicture: string;
  phoneNumber: string;
  passportNumber: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  phoneNumber?: string;
  passportNumber?: string;
  general?: string;
  profilePicture?: string;
}

export default function Account() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState<UserProfile>({
    firstName: '',
    lastName: '',
    email: '',
    profilePicture: 'profile.jpg',
    phoneNumber: '',
    passportNumber: '',
  });
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  // Load saved form data from localStorage
  useEffect(() => {
    const savedFormData = localStorage.getItem('accountFormData');
    if (savedFormData) {
      try {
        const parsedData = JSON.parse(savedFormData);
        setFormData(parsedData);
      } catch (error) {
        console.error('Error parsing saved form data:', error);
      }
    }
  }, []);

  // Save form data to localStorage when it changes
  useEffect(() => {
    if (formData.firstName || formData.lastName || formData.email || 
        formData.phoneNumber || formData.passportNumber) {
      localStorage.setItem('accountFormData', JSON.stringify(formData));
    }
  }, [formData]);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchProfile();
  }, [router]);

  const fetchProfile = async () => {

    try {
      const token = localStorage.getItem('token');
      console.log('Token:', token); // Debug log for token

    
      const response = await fetch('/api/auth/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      console.log('Response status:', response.status); // Debug log for response status
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData); // Debug log for error response
        throw new Error(errorData.message || 'Failed to fetch profile');
      }

      const data = await response.json();
      console.log('Raw API response:', data); // Debug log for raw response

      // Check if data exists and has the expected structure
      if (!data) {
        throw new Error('No data received from server');
      }

      // Ensure all required fields are present
      const profileData = {
        firstName: data.user.firstName || '',
        lastName: data.user.lastName || '',
        email: data.user.email || '',
        profilePicture: data.user.profilePicture || 'profile.jpg',
        phoneNumber: data.user.phoneNumber || '',
        passportNumber: data.user.passportNumber || '',
      };

      console.log('Processed profile data:', profileData); // Debug log for processed data

      // Set the state with the processed data
      setProfile(profileData);
      setFormData(profileData);
        
    } catch (error) {
      console.error('Error in fetchProfile:', error); // Debug log for caught errors
      setErrors({
        general: error instanceof Error ? error.message : 'Failed to load profile'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassportNumber = (passport: string) => {
    return passport.length >= 9;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (errors.password) {
      setErrors(prev => ({
        ...prev,
        password: undefined
      }));
    }
  };

  const validateForm = () => {
    const newErrors: FormErrors = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (password && password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }
    
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    }
    
    if (!validatePassportNumber(formData.passportNumber)) {
      newErrors.passportNumber = 'Passport number must be at least 9 characters long';
    }

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrors({});

    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsSaving(false);
      return;
    }

    try {
      const updateData = {
        ...formData,
        ...(password && { password })
      };

      // log the updateData to see what is being sent
      console.log('Update Data:', updateData); // Debug log for update data

      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }

      setProfile(data);
      setIsEditing(false);
      setPassword('');
    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : 'Failed to update profile'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Account - FlyNext</title>
        <meta name="description" content="Manage your FlyNext account" />
      </Head>

      <div className="min-h-screen bg-gray-50 flex flex-col py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <Link href="/" className="flex items-center text-blue-600 hover:text-blue-800 mb-8">
            <FaArrowLeft className="mr-2" />
            Back to Home
          </Link>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Account Information
          </h2>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded relative mb-6" role="alert">
                <span className="block sm:inline">{errors.general}</span>
              </div>
            )}

            <div className="flex flex-col items-center mb-6">
              <div className="relative w-32 h-32 rounded-full overflow-hidden mb-4 border-4 border-blue-500">
                {profile?.profilePicture ? (
                  <div className="relative w-full h-full">
                    <img 
                      src={profile.profilePicture} 
                      alt="Profile" 
                      className="object-cover w-full h-full"
                      onError={(e) => {
                        // Fallback to default image if the URL is invalid
                        (e.target as HTMLImageElement).src = 'profile.jpg';
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <FaUser className="h-16 w-16 text-gray-400" />
                  </div>
                )}
              </div>
              <h3 className="text-xl font-bold">{profile?.firstName} {profile?.lastName}</h3>
              <p className="text-gray-500">{profile?.email}</p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                    First Name
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaUser className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="firstName"
                      id="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className={`block w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                        errors.firstName ? 'border-red-300' : 'border-gray-300'
                      } ${!isEditing ? 'bg-gray-100' : ''}`}
                    />
                  </div>
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                    Last Name
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaUser className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="lastName"
                      id="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className={`block w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                        errors.lastName ? 'border-red-300' : 'border-gray-300'
                      } ${!isEditing ? 'bg-gray-100' : ''}`}
                    />
                  </div>
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaEnvelope className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={`block w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      errors.email ? 'border-red-300' : 'border-gray-300'
                    } ${!isEditing ? 'bg-gray-100' : ''}`}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="profilePicture" className="block text-sm font-medium text-gray-700">
                  Profile Picture URL (Optional)
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaImage className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="profilePicture"
                    id="profilePicture"
                    value={formData.profilePicture}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="https://example.com/profile.jpg"
                    className={`block w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      errors.profilePicture ? 'border-red-300' : 'border-gray-300'
                    } ${!isEditing ? 'bg-gray-100' : ''}`}
                  />
                </div>
                {errors.profilePicture && (
                  <p className="mt-1 text-sm text-red-600">{errors.profilePicture}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">Enter a URL to your profile picture or leave blank to use default</p>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  {isEditing ? 'New Password (leave blank to keep current)' : 'Password'}
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaLock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    name="password"
                    id="password"
                    value={password}
                    onChange={handlePasswordChange}
                    disabled={!isEditing}
                    className={`block w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      errors.password ? 'border-red-300' : 'border-gray-300'
                    } ${!isEditing ? 'bg-gray-100' : ''}`}
                  />
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
              </div>

              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaPhone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    name="phoneNumber"
                    id="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={`block w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      errors.phoneNumber ? 'border-red-300' : 'border-gray-300'
                    } ${!isEditing ? 'bg-gray-100' : ''}`}
                  />
                </div>
                {errors.phoneNumber && (
                  <p className="mt-1 text-sm text-red-600">{errors.phoneNumber}</p>
                )}
              </div>

              <div>
                <label htmlFor="passportNumber" className="block text-sm font-medium text-gray-700">
                  Passport Number
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaPassport className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="passportNumber"
                    id="passportNumber"
                    value={formData.passportNumber}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={`block w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      errors.passportNumber ? 'border-red-300' : 'border-gray-300'
                    } ${!isEditing ? 'bg-gray-100' : ''}`}
                  />
                </div>
                {errors.passportNumber && (
                  <p className="mt-1 text-sm text-red-600">{errors.passportNumber}</p>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setFormData(profile || formData);
                        setPassword('');
                        setErrors({});
                      }}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      {isSaving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <FaSave className="mr-2" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <FaEdit className="mr-2" />
                    Edit Profile
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
} 