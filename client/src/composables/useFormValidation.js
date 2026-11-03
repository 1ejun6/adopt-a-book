import { nextTick, ref } from 'vue';

//@lee-hlmilk > share native field validation > each form keeps its rules &&& toast message
export function useFormValidation() {
    const invalidFields = ref([]);

    function validate(form) {
        invalidFields.value = Array.from(form.elements).filter(field => field.willValidate && !field.validity.valid).map(field => field.id);
        return invalidFields.value.length === 0;
    }

    function clearInvalid(event) {
        const field = event.target;
        if (field.validity?.valid && invalidFields.value.includes(field.id)) {
            invalidFields.value = invalidFields.value.filter(id => id !== field.id);
        }
    }

    //@lee-hlmilk > wait for borders &&& any form-owned collapsed section to render before focusing
    function focusInvalid(form) { nextTick(() => { if (form.isConnected) { form.querySelector('[aria-invalid="true"]')?.focus(); } }); }
    function resetValidation() { invalidFields.value = []; }

    return { invalidFields, validate, clearInvalid, focusInvalid, resetValidation };
}
