import { Router } from 'express';
import {
  findLeadsApifyApollo,
  findLeadsGoogleMaps,
  findPeopleIcyPeas,
  findEmailIcyPeas,
  verifyEmailNeverBounce,
  scrapeWebsite,
  getLinkedInCompanyProfile,
  generatePersonalization,
  addLeadsToHeyReach,
  addLeadsToInstantly,
} from '../services/lead-services.js';
import { updateLeadsOutreachSentByEmails } from '../db.js';

const router = Router();

// ============================================================================
// LEAD DISCOVERY
// ============================================================================

// POST /api/lead-generation/discover/apollo
router.post('/discover/apollo', async (req, res) => {
  try {
    const { searchUrl, maxResults, cookies } = req.body;
    
    if (!searchUrl) {
      return res.status(400).json({ error: 'searchUrl is required' });
    }

    const leads = await findLeadsApifyApollo({ searchUrl, maxResults, cookies });
    
    res.json({ 
      success: true, 
      count: leads.length,
      leads 
    });
  } catch (err) {
    console.error('Apollo discovery error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/lead-generation/discover/google-maps
router.post('/discover/google-maps', async (req, res) => {
  try {
    const { searchQuery, maxResults } = req.body;
    
    if (!searchQuery) {
      return res.status(400).json({ error: 'searchQuery is required' });
    }

    const businesses = await findLeadsGoogleMaps({ searchQuery, maxResults });
    
    res.json({ 
      success: true, 
      count: businesses.length,
      businesses 
    });
  } catch (err) {
    console.error('Google Maps discovery error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/lead-generation/discover/icypeas
router.post('/discover/icypeas', async (req, res) => {
  try {
    const { jobTitles, locations, companies, keywords, limit } = req.body;
    
    console.log('IcyPeas discovery request:', { jobTitles, locations, companies, keywords, limit });
    
    const result = await findPeopleIcyPeas({
      jobTitles,
      locations,
      companies,
      keywords,
      limit,
    });
    
    console.log('IcyPeas raw response:', JSON.stringify(result).substring(0, 500));
    console.log('IcyPeas result keys:', Object.keys(result));
    
    // IcyPeas returns { success: true, leads: [...], total: X }
    let peopleArray = [];
    if (Array.isArray(result.leads)) {
      peopleArray = result.leads;
    } else if (result.people && Array.isArray(result.people.leads)) {
      peopleArray = result.people.leads;
    } else if (Array.isArray(result.people)) {
      peopleArray = result.people;
    } else if (Array.isArray(result.data)) {
      peopleArray = result.data;
    } else if (Array.isArray(result)) {
      peopleArray = result;
    }
    
    console.log('People array length:', peopleArray.length);
    if (peopleArray.length > 0) {
      console.log('First person sample:', JSON.stringify(peopleArray[0]).substring(0, 300));
    }
    
    res.json({ 
      success: true, 
      count: peopleArray.length,
      people: peopleArray,
      total: result.total || peopleArray.length,
      pagination: result.pagination || null
    });
  } catch (err) {
    console.error('IcyPeas discovery error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// LEAD ENRICHMENT
// ============================================================================

// POST /api/lead-generation/enrich/email
router.post('/enrich/email', async (req, res) => {
  try {
    const { firstName, lastName, company } = req.body;
    
    if (!firstName || !lastName || !company) {
      return res.status(400).json({ error: 'firstName, lastName, and company are required' });
    }

    const emailData = await findEmailIcyPeas({ firstName, lastName, company });
    
    res.json({ 
      success: true, 
      email: emailData.email || null,
      confidence: emailData.confidence,
      data: emailData
    });
  } catch (err) {
    console.error('Email enrichment error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/lead-generation/verify/email
router.post('/verify/email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    const verification = await verifyEmailNeverBounce(email);
    
    res.json({ 
      success: true, 
      result: verification.result,
      flags: verification.flags,
      verified: verification.result === 'valid'
    });
  } catch (err) {
    console.error('Email verification error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/lead-generation/scrape/website
router.post('/scrape/website', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'url is required' });
    }

    const html = await scrapeWebsite(url);
    
    // Extract text content (basic - could be enhanced)
    const textContent = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    
    res.json({ 
      success: true, 
      html,
      text: textContent.substring(0, 5000), // First 5000 chars
      length: html.length
    });
  } catch (err) {
    console.error('Website scraping error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/lead-generation/linkedin/company/:slug
router.get('/linkedin/company/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    if (!slug) {
      return res.status(400).json({ error: 'company slug is required' });
    }

    const profile = await getLinkedInCompanyProfile(slug);
    
    res.json({ 
      success: true, 
      profile 
    });
  } catch (err) {
    console.error('LinkedIn company fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// AI PERSONALIZATION
// ============================================================================

// POST /api/lead-generation/personalize
router.post('/personalize', async (req, res) => {
  try {
    const { prompt, leadData } = req.body;
    
    if (!prompt || !leadData) {
      return res.status(400).json({ error: 'prompt and leadData are required' });
    }

    const personalizedMessage = await generatePersonalization({ prompt, leadData });
    
    res.json({ 
      success: true, 
      message: personalizedMessage
    });
  } catch (err) {
    console.error('Personalization error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// OUTREACH
// ============================================================================

// POST /api/lead-generation/outreach/heyreach
router.post('/outreach/heyreach', async (req, res) => {
  try {
    const { leads, project_id } = req.body;
    
    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ error: 'leads array is required' });
    }

    const result = await addLeadsToHeyReach(leads);
    
    const orgId = req.orgId;
    if (orgId) {
      const emails = leads.map(l => l.email).filter(Boolean);
      if (emails.length) await updateLeadsOutreachSentByEmails(orgId, emails, project_id || null);
    }
    
    res.json({ 
      success: true, 
      result 
    });
  } catch (err) {
    console.error('HeyReach outreach error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/lead-generation/outreach/instantly
router.post('/outreach/instantly', async (req, res) => {
  try {
    const { leads, project_id } = req.body;
    
    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ error: 'leads array is required' });
    }

    const results = await addLeadsToInstantly(leads);
    
    const orgId = req.orgId;
    if (orgId) {
      const emails = leads.map(l => l.email).filter(Boolean);
      if (emails.length) await updateLeadsOutreachSentByEmails(orgId, emails, project_id || null);
    }
    
    res.json({ 
      success: true, 
      results 
    });
  } catch (err) {
    console.error('Instantly outreach error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
