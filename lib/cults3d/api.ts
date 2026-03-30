import type {
  Cults3DCategory,
  Cults3DLicense,
  Cults3DCreateInput,
} from "@/lib/types/cults3d";

const CULTS3D_GRAPHQL_URL = "https://cults3d.com/graphql";

async function graphqlRequest(
  query: string,
  credentials: { username: string; apiKey: string }
): Promise<unknown> {
  const basicAuth = Buffer.from(
    `${credentials.username}:${credentials.apiKey}`
  ).toString("base64");

  const res = await fetch(CULTS3D_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: `query=${encodeURIComponent(query)}`,
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error(`AUTH_FAILED:${res.status}`);
  }

  if (!res.ok) {
    throw new Error(`CULTS3D_API_ERROR:${res.status}`);
  }

  return res.json();
}

export async function verifyCults3DCredentials(
  username: string,
  apiKey: string
): Promise<{ nick: string }> {
  const query = `{ myself { user { nick } } }`;
  const data = (await graphqlRequest(query, { username, apiKey })) as {
    data?: { myself?: { user?: { nick?: string } } };
  };

  const nick = data?.data?.myself?.user?.nick;
  if (!nick) {
    throw new Error("AUTH_FAILED:Could not retrieve account info");
  }

  return { nick };
}

export async function fetchCults3DCategories(
  credentials: { username: string; apiKey: string }
): Promise<Cults3DCategory[]> {
  const query = `{
    categories {
      id
      name(locale: EN)
      children {
        id
        name(locale: EN)
      }
    }
  }`;

  const data = (await graphqlRequest(query, credentials)) as {
    data?: { categories?: Cults3DCategory[] };
  };

  return data?.data?.categories ?? [];
}

export async function fetchCults3DLicenses(
  credentials: { username: string; apiKey: string }
): Promise<Cults3DLicense[]> {
  const query = `{
    licenses {
      code
      name(locale: EN)
      url(locale: EN)
      availableOnFreeDesigns
      availableOnPricedDesigns
    }
  }`;

  const data = (await graphqlRequest(query, credentials)) as {
    data?: { licenses?: Cults3DLicense[] };
  };

  return data?.data?.licenses ?? [];
}

export async function createCults3DDesign(
  credentials: { username: string; apiKey: string },
  input: Cults3DCreateInput
): Promise<{ url: string }> {
  const imageUrlsStr = input.imageUrls.map((u) => `"${u}"`).join(", ");
  const fileUrlsStr = input.fileUrls.map((u) => `"${u}"`).join(", ");

  let subCategoryPart = "";
  if (input.subCategoryIds && input.subCategoryIds.length > 0) {
    const ids = input.subCategoryIds.map((id) => `"${id}"`).join(", ");
    subCategoryPart = `subCategoryIds: [${ids}]`;
  }

  let licensePart = "";
  if (input.licenseCode) {
    licensePart = `licenseCode: "${input.licenseCode}"`;
  }

  const escapedName = input.name.replace(/"/g, '\\"');
  const escapedDesc = input.description.replace(/"/g, '\\"').replace(/\n/g, "\\n");

  const query = `mutation {
    createCreation(
      name: "${escapedName}"
      description: "${escapedDesc}"
      imageUrls: [${imageUrlsStr}]
      fileUrls: [${fileUrlsStr}]
      locale: ${input.locale}
      categoryId: "${input.categoryId}"
      ${subCategoryPart}
      downloadPrice: ${input.downloadPrice}
      currency: ${input.currency}
      ${licensePart}
    ) {
      creation {
        url(locale: EN)
      }
      errors
    }
  }`;

  const data = (await graphqlRequest(query, credentials)) as {
    data?: {
      createCreation?: {
        creation?: { url?: string };
        errors?: string[];
      };
    };
  };

  const result = data?.data?.createCreation;
  if (result?.errors && result.errors.length > 0) {
    const err = new Error("CULTS3D_CREATION_ERRORS");
    (err as Error & { apiErrors: string[] }).apiErrors = result.errors;
    throw err;
  }

  const url = result?.creation?.url;
  if (!url) {
    throw new Error("CULTS3D_API_ERROR:No URL returned for created design");
  }

  return { url };
}
