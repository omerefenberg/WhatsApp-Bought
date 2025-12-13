import axios from 'axios';
import { API_BASE_URL } from '../config/api';

export const goalsService = {
  /**
   * Get all goals for a user
   * @param {string} userId - User's WhatsApp phone number
   * @param {string} status - Optional: 'active', 'completed', 'cancelled'
   * @returns {Promise} API response with goals array
   */
  getAllGoals: async (userId, status = 'active') => {
    const params = { userId };
    if (status) params.status = status;

    const response = await axios.get(`${API_BASE_URL}/goals`, { params });
    return response.data;
  }
};
