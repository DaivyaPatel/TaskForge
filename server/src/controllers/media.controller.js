import { getLinkPreview } from '../services/preview.service.js';
import { ApiError } from '../utils/apiError.js';

export const linkPreview = async (req, res) => {
  const { url } = req.body;
  if (!url) throw new ApiError(400, "URL is required");

  try {
    const data = await getLinkPreview(url);
    res.status(200).json(data);
  } catch (err) {
    throw new ApiError(500, "Failed to scrape link preview");
  }
};