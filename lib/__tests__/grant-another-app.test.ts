import { describe, it, expect } from "vitest";
import { newOrgHrefForPerson, pickPrimaryPerson } from "../grant-another-app";

describe("newOrgHrefForPerson", () => {
  it("builds a prefilled /orgs/new link with client, name and email encoded", () => {
    expect(
      newOrgHrefForPerson({
        clientName: "Antonio Sanches - TESTE",
        adminName: "Antonio Sanches",
        adminEmail: "pepoclv+master@hotmail.com",
      }),
    ).toBe(
      "/orgs/new?clientName=Antonio+Sanches+-+TESTE&adminName=Antonio+Sanches&adminEmail=pepoclv%2Bmaster%40hotmail.com",
    );
  });

  it("omits missing fields", () => {
    expect(newOrgHrefForPerson({ adminEmail: "a@b.com" })).toBe("/orgs/new?adminEmail=a%40b.com");
    expect(newOrgHrefForPerson({ adminName: "Só Nome" })).toBe("/orgs/new?adminName=S%C3%B3+Nome");
  });

  it("returns the bare route when nothing to prefill", () => {
    expect(newOrgHrefForPerson({})).toBe("/orgs/new");
    expect(newOrgHrefForPerson({ clientName: "", adminName: "", adminEmail: "" })).toBe("/orgs/new");
  });
});

describe("pickPrimaryPerson", () => {
  it("prefers the admin member that has an email", () => {
    const person = pickPrimaryPerson([
      { isAdmin: false, name: "Zé", email: "ze@y.com" },
      { isAdmin: true, name: "Dona", email: "dona@y.com" },
    ]);
    expect(person).toEqual({ name: "Dona", email: "dona@y.com" });
  });

  it("falls back to the first member with an email when no admin has one", () => {
    const person = pickPrimaryPerson([
      { isAdmin: true, name: "Sem Email", email: null },
      { isAdmin: false, name: "Primeiro", email: "primeiro@y.com" },
    ]);
    expect(person).toEqual({ name: "Primeiro", email: "primeiro@y.com" });
  });

  it("returns null when no member has an email", () => {
    expect(pickPrimaryPerson([{ isAdmin: true, name: "X", email: null }])).toBeNull();
    expect(pickPrimaryPerson([])).toBeNull();
  });
});
