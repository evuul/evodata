'use client';

import { unstable_createUseMediaQuery } from '@mui/system/useMediaQuery';

const MATERIAL_THEME_ID = '$$material';

const useMuiMediaQuery = unstable_createUseMediaQuery({ themeId: MATERIAL_THEME_ID });

export default useMuiMediaQuery;
